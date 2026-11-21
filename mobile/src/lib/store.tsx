// État global de l'appli : session, cache hors ligne, file des passages, synchro auto.
import NetInfo from "@react-native-community/netinfo";
import * as Crypto from "expo-crypto";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AppState } from "react-native";
import { api, AuthError, OfflineError, SubscriptionError } from "./api";
import { applySnapshot, applySyncResults, displayedCard, emptyLedger, recordOp, upsertCard, type Ledger } from "./ledger";
import { getJson, getSecret, remove, setJson, setSecret } from "./storage";
import type { CardView, OpKind, Session, Subscription } from "./types";

const LEDGER_KEY = "fidelite.ledger";
const RETRY_MS = 30_000;

interface Store {
  ready: boolean;
  session?: Session;
  ledger: Ledger;
  online: boolean;
  syncing: boolean;
  login(email: string, pin: string): Promise<void>;
  /** Ouvre la boutique de démonstration. */
  startDemo(): Promise<void>;
  logout(): Promise<void>;
  /** Carte à afficher pour un numéro scanné ; rafraîchit depuis le serveur si possible. */
  lookup(serial: string): Promise<CardView | undefined>;
  record(serial: string, kind: OpKind, amount: number): { error?: string };
  syncNow(): Promise<void>;
  dismissRejected(): void;
  /** Met à jour l'état de l'abonnement (connu par la synchro, un 402 ou l'écran Compte). */
  setSubscription(sub: Subscription): void;
  /** Le serveur a répondu 402 : l'abonnement n'est plus actif. */
  markSubscriptionInactive(): void;
}

const Ctx = createContext<Store | null>(null);

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore hors du StoreProvider");
  return s;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session>();
  const [ledger, setLedger] = useState<Ledger>(emptyLedger);
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Références pour lire l'état le plus récent dans les callbacks asynchrones
  const ledgerRef = useRef(ledger);
  const sessionRef = useRef(session);
  const syncingRef = useRef(false);
  const applySession = useCallback((s: Session | undefined) => {
    sessionRef.current = s;
    setSession(s);
  }, []);

  /** Toute modification passe par ici : mise à jour immédiate + sauvegarde sur le téléphone. */
  const commit = useCallback((next: Ledger | ((l: Ledger) => Ledger)) => {
    const value = typeof next === "function" ? next(ledgerRef.current) : next;
    ledgerRef.current = value;
    setLedger(value);
    void setJson(LEDGER_KEY, value);
  }, []);

  const setSubscription = useCallback(
    (sub: Subscription) => {
      const s = sessionRef.current;
      if (!s || JSON.stringify(s.subscription) === JSON.stringify(sub)) return;
      const next = { ...s, subscription: sub };
      applySession(next);
      void setSecret(JSON.stringify(next));
    },
    [applySession],
  );

  const markSubscriptionInactive = useCallback(() => {
    const cur = sessionRef.current?.subscription;
    // On garde le statut précis s'il est déjà connu (en attente, résilié…), sinon "résilié"
    const status = cur && cur.status !== "active" && cur.status !== "trialing" ? cur.status : "canceled";
    setSubscription({ ...cur, plan: cur?.plan ?? "", trialEnd: undefined, status, active: false });
  }, [setSubscription]);

  const logout = useCallback(async () => {
    // Le jeton est aussi invalidé côté serveur (sans bloquer si on est hors ligne)
    const token = sessionRef.current?.token;
    if (token) void api.logout(token).catch(() => undefined);
    await setSecret(null);
    // La file non envoyée est gardée : elle partira à la prochaine connexion.
    applySession(undefined);
  }, [applySession]);

  const handleError = useCallback(
    (e: unknown) => {
      if (e instanceof OfflineError) setOnline(false);
      else if (e instanceof AuthError) void logout();
      else if (e instanceof SubscriptionError) markSubscriptionInactive();
      else console.warn(e);
    },
    [logout, markSubscriptionInactive],
  );

  const syncNow = useCallback(async () => {
    const s = sessionRef.current;
    if (!s || syncingRef.current) return;
    syncingRef.current = true;
    setSyncing(true);
    try {
      const sent = [...ledgerRef.current.pending];
      // En démo, rien n'est envoyé : les passages restent sur le téléphone
      if (sent.length && !s.demo) {
        const { results } = await api.sync(s.token, sent);
        commit((l) => applySyncResults(l, sent, results));
      }
      const snap = await api.snapshot(s.token);
      commit((l) => applySnapshot(l, snap));
      if (snap.subscription) setSubscription(snap.subscription);
      setOnline(true);
    } catch (e) {
      handleError(e);
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [commit, handleError, setSubscription]);

  // Démarrage : on recharge la session et le cache enregistrés
  useEffect(() => {
    void (async () => {
      const saved = await getJson<Ledger>(LEDGER_KEY);
      if (saved) commit({ ...emptyLedger(), ...saved });
      const raw = await getSecret();
      if (raw) {
        try {
          applySession(JSON.parse(raw) as Session);
        } catch {
          await setSecret(null);
        }
      }
      setReady(true);
    })();
  }, [commit, applySession]);

  // Synchro : à la connexion, au retour du réseau, au retour au premier plan, et toutes les 30 s
  useEffect(() => {
    if (!session) return;
    // Première synchro juste après l'affichage (pas pendant le rendu)
    const first = setTimeout(() => void syncNow(), 0);
    // NetInfo peut prévenir à chaque vérification réseau : on ne synchronise
    // qu'au moment où la connexion revient, pas à chaque notification.
    let wasOn: boolean | undefined;
    const unsubNet = NetInfo.addEventListener((state) => {
      const isOn = state.isConnected !== false;
      setOnline(isOn);
      if (isOn && wasOn === false) void syncNow();
      wasOn = isOn;
    });
    const appSub = AppState.addEventListener("change", (st) => st === "active" && void syncNow());
    const timer = setInterval(() => {
      if (ledgerRef.current.pending.length) void syncNow();
    }, RETRY_MS);
    return () => {
      unsubNet();
      appSub.remove();
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [session, syncNow]);

  const open = useCallback(
    async (s: Session) => {
      // Changement de commerce sur ce téléphone : on vide le cache de l'ancien
      if (sessionRef.current?.staff.merchantId !== s.staff.merchantId) {
        const prev = await getJson<Ledger>(LEDGER_KEY);
        if (!prev?.pending.length) {
          await remove(LEDGER_KEY);
          commit(emptyLedger());
        }
      }
      await setSecret(JSON.stringify(s));
      applySession(s);
    },
    [commit, applySession],
  );

  const login = useCallback(async (email: string, pin: string) => open(await api.login(email, pin)), [open]);
  const startDemo = useCallback(async () => open(await api.demo()), [open]);

  const lookup = useCallback(
    async (serial: string) => {
      const s = sessionRef.current;
      if (s) {
        try {
          const { card } = await api.card(s.token, serial);
          commit((l) => upsertCard(l, card));
          setOnline(true);
        } catch (e) {
          if (!(e instanceof OfflineError || e instanceof AuthError)) {
            // 404 : carte inconnue de ce commerce (connu en ligne)
            return displayedCard(ledgerRef.current, serial);
          }
          handleError(e);
        }
      }
      return displayedCard(ledgerRef.current, serial);
    },
    [commit, handleError],
  );

  const record = useCallback(
    (serial: string, kind: OpKind, amount: number) => {
      const r = recordOp(ledgerRef.current, serial, kind, amount, Crypto.randomUUID());
      if (r.error) return { error: r.error };
      if (sessionRef.current?.demo) {
        // Démo : la carte change à l'écran, mais rien ne part au serveur
        const card = displayedCard(r.ledger, serial);
        if (card) commit((l) => upsertCard(l, card));
        return {};
      }
      commit(r.ledger);
      void syncNow();
      return {};
    },
    [commit, syncNow],
  );

  const dismissRejected = useCallback(() => commit((l) => ({ ...l, rejected: [] })), [commit]);

  const value = useMemo<Store>(
    () => ({
      ready,
      session,
      ledger,
      online,
      syncing,
      login,
      startDemo,
      logout,
      lookup,
      record,
      syncNow,
      dismissRejected,
      setSubscription,
      markSubscriptionInactive,
    }),
    [ready, session, ledger, online, syncing, login, startDemo, logout, lookup, record, syncNow, dismissRejected, setSubscription, markSubscriptionInactive],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
