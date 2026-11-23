// Onglet Profil : compte, abonnement, équipe, données des clients, sécurité, synchronisation.
import Constants from "expo-constants";
import { useState } from "react";
import { Linking, Platform, View } from "react-native";
import { Text } from "@/ui/text";
import { api } from "@/lib/api";
import { BRAND } from "@/lib/brand";
import { formatDate, formatDateTime, plural } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Subscription, TeamMember } from "@/lib/types";
import { toRemoteError, useRemote } from "@/lib/useRemote";
import { ExportPanel } from "@/features/export/ExportPanel";
import { Badge, Button, ErrorMessage, Field, Loading, Notice, Row, ScrollScreen, Section } from "@/ui/components";
import { confirm } from "@/ui/confirm";
import { space, usePalette } from "@/ui/theme";

/** Achat et facturation : uniquement sur le web (les stores interdisent un paiement hors de leur système). */
const CAN_MANAGE_BILLING = Platform.OS === "web";

const STATUS_LABEL: Record<Subscription["status"], string> = {
  active: "Actif",
  trialing: "Période d'essai",
  past_due: "Paiement en échec",
  pending: "En attente de paiement",
  canceled: "Résilié",
};

export default function ProfilScreen() {
  const { session } = useStore();
  const owner = session?.staff.role === "owner";
  return (
    <ScrollScreen tabs title="Profil" eyebrow={session?.demo ? "Mode démo" : owner ? "Responsable" : "Vendeur"}>
      <AccountSection />
      {owner && <TeamSection />}
      {owner && <DataSection />}
      <SecuritySection />
      <SyncSection />
      {!session?.demo && <DeleteSection owner={owner} />}
    </ScrollScreen>
  );
}

function AccountSection() {
  const { session, ledger, setSubscription } = useStore();
  const { data } = useRemote(async (token) => {
    const account = await api.account(token);
    if (account.subscription) setSubscription(account.subscription);
    return account;
  });
  const sub = data?.subscription ?? session?.subscription;
  const owner = session?.staff.role === "owner";
  const [opening, setOpening] = useState(false);

  async function openBilling() {
    if (!session) return;
    setOpening(true);
    try {
      const { url } = await api.billing(session.token);
      await Linking.openURL(url);
    } finally {
      setOpening(false);
    }
  }

  return (
    <>
      <Section title="Compte">
        <Row icon="person-circle-outline" title={data?.staff.name ?? session?.staff.name ?? ""} subtitle={data?.staff.email} right={owner ? "Responsable" : "Vendeur"} />
        <Row icon="storefront-outline" title={data?.merchant.name || ledger.merchantName || "—"} last />
      </Section>
      {owner && sub && (
        <Section title="Abonnement">
          <Row
            icon="card-outline"
            title={sub.planName ?? "Abonnement"}
            // Le prix n'apparaît que sur la version web (règles App Store / Google Play)
            subtitle={CAN_MANAGE_BILLING ? sub.plan : undefined}
            right={<Badge text={STATUS_LABEL[sub.status]} tone={sub.active && sub.status !== "past_due" ? "ok" : "warn"} />}
          />
          <Row
            icon="calendar-outline"
            title={sub.trialEnd ? "Fin de l'essai gratuit" : "Prochaine échéance"}
            subtitle={sub.trialEnd ? "Premier prélèvement à cette date, sauf résiliation avant." : undefined}
            right={sub.trialEnd ? formatDate(sub.trialEnd) : sub.currentPeriodEnd ? formatDate(sub.currentPeriodEnd) : "—"}
            last={!CAN_MANAGE_BILLING}
          />
          {CAN_MANAGE_BILLING && <Row icon="open-outline" title={opening ? "Ouverture…" : "Factures et moyen de paiement"} onPress={() => void openBilling()} last />}
        </Section>
      )}
    </>
  );
}

function TeamSection() {
  const p = usePalette();
  const { session } = useStore();
  const { data, error, loading, reload, setData } = useRemote((token) => api.team(token));
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", pin: "" });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string }>();

  async function add() {
    if (!session) return;
    setBusy(true);
    setNotice(undefined);
    try {
      const { member } = await api.addTeamMember(session.token, { ...form, email: form.email.trim() });
      setData((d) => (d ? { team: [...d.team, member] } : d));
      setForm({ name: "", email: "", pin: "" });
      setAdding(false);
      setNotice({ tone: "ok", text: `${member.name} peut se connecter avec ${member.email} et son code.` });
    } catch (e) {
      setNotice({ tone: "error", text: toRemoteError(e).message });
    } finally {
      setBusy(false);
    }
  }

  async function remove(m: TeamMember) {
    if (!session) return;
    if (!(await confirm(`Retirer ${m.name} ?`, "Ce compte ne pourra plus se connecter. Ses passages restent dans l'historique.", "Retirer", true))) return;
    try {
      await api.removeTeamMember(session.token, m.id);
      setData((d) => (d ? { team: d.team.filter((x) => x.id !== m.id) } : d));
    } catch (e) {
      setNotice({ tone: "error", text: toRemoteError(e).message });
    }
  }

  return (
    <Section title="Équipe">
      {loading ? (
        <Loading />
      ) : error || !data ? (
        <ErrorMessage error={error ?? { kind: "other", message: "Indisponible" }} onRetry={reload} />
      ) : (
        <>
          {data.team.map((m) => (
            <Row
              key={m.id}
              icon={m.role === "owner" ? "shield-checkmark-outline" : "person-outline"}
              title={m.me ? `${m.name} (vous)` : m.name}
              subtitle={m.email}
              right={m.role === "owner" ? "Responsable" : "Retirer"}
              onPress={m.role === "staff" ? () => void remove(m) : undefined}
            />
          ))}
          <View style={{ padding: space.md, gap: space.md }}>
            {notice && <Notice tone={notice.tone} text={notice.text} />}
            {adding ? (
              <>
                <Field label="Nom" value={form.name} onChangeText={(name) => setForm((f) => ({ ...f, name }))} maxLength={40} />
                <Field
                  label="E-mail"
                  value={form.email}
                  onChangeText={(email) => setForm((f) => ({ ...f, email }))}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                <Field
                  label="Code (4 à 8 chiffres)"
                  value={form.pin}
                  onChangeText={(pin) => setForm((f) => ({ ...f, pin: pin.replace(/\D/g, "").slice(0, 8) }))}
                  keyboardType="number-pad"
                  secureTextEntry
                  hint="Communiquez-le au vendeur de vive voix. Il pourra le changer dans son profil."
                />
                <Button label="Ajouter le vendeur" onPress={() => void add()} loading={busy} disabled={!form.name.trim() || !form.email.includes("@") || form.pin.length < 4} />
                <Button label="Annuler" variant="secondary" onPress={() => setAdding(false)} />
              </>
            ) : (
              <Button label="Ajouter un vendeur" variant="secondary" icon="person-add-outline" onPress={() => setAdding(true)} />
            )}
            <Text style={{ color: p.muted, fontSize: 13 }}>Un vendeur peut scanner et voir les clients, mais pas modifier la carte, envoyer des messages ou voir les chiffres.</Text>
          </View>
        </>
      )}
    </Section>
  );
}

function DataSection() {
  const p = usePalette();
  return (
    <Section title="Données des clients">
      <View style={{ padding: space.md, gap: space.md }}>
        <Text style={{ color: p.text, lineHeight: 20 }}>
          Vos clients vous appartiennent. Exportez-les quand vous voulez, en Excel, en PDF ou en CSV. Pour effacer un client à sa demande,
          ouvrez sa fiche.
        </Text>
        <ExportPanel />
      </View>
    </Section>
  );
}

function SecuritySection() {
  const { session } = useStore();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string }>();
  const digits = (v: string) => v.replace(/\D/g, "").slice(0, 8);

  async function save() {
    if (!session) return;
    setBusy(true);
    setNotice(undefined);
    try {
      await api.changePin(session.token, current, next);
      setCurrent("");
      setNext("");
      setOpen(false);
      setNotice({ tone: "ok", text: "Code modifié." });
    } catch (e) {
      setNotice({ tone: "error", text: toRemoteError(e).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section title="Sécurité">
      {!open ? (
        <Row icon="key-outline" title="Changer mon code" onPress={() => setOpen(true)} last />
      ) : (
        <View style={{ padding: space.md, gap: space.md }}>
          <Field label="Code actuel" value={current} onChangeText={(v) => setCurrent(digits(v))} keyboardType="number-pad" secureTextEntry />
          <Field label="Nouveau code (6 à 8 chiffres)" value={next} onChangeText={(v) => setNext(digits(v))} keyboardType="number-pad" secureTextEntry />
          <Button label="Enregistrer" onPress={() => void save()} loading={busy} disabled={current.length < 4 || next.length < 6} />
          <Button label="Annuler" variant="secondary" onPress={() => setOpen(false)} />
        </View>
      )}
      {notice && (
        <View style={{ padding: space.md }}>
          <Notice tone={notice.tone} text={notice.text} />
        </View>
      )}
    </Section>
  );
}

function SyncSection() {
  const p = usePalette();
  const { session, ledger, online, syncNow, logout } = useStore();
  const version = Constants.expoConfig?.version ?? "—";

  async function signOut() {
    const pending = ledger.pending.length;
    const ok =
      !pending ||
      (await confirm(
        "Se déconnecter ?",
        `${plural(pending, "passage n'est", "passages ne sont")} pas encore ${pending > 1 ? "envoyés. Ils restent" : "envoyé. Il reste"} sur ce téléphone et ${pending > 1 ? "partiront" : "partira"} à la prochaine connexion.`,
        "Se déconnecter",
      ));
    if (ok) await logout();
  }

  return (
    <>
      <Section title="Synchronisation">
        <Row icon={online ? "cloud-done-outline" : "cloud-offline-outline"} title={online ? "En ligne" : "Hors ligne"} />
        <Row icon="time-outline" title="Dernière synchronisation" right={ledger.lastSyncAt ? formatDateTime(ledger.lastSyncAt) : "jamais"} />
        <Row icon="hourglass-outline" title="Passages en attente d'envoi" right={String(ledger.pending.length)} />
        <Row icon="refresh-outline" title="Synchroniser maintenant" onPress={() => void syncNow()} last />
      </Section>
      <Button label={session?.demo ? "Quitter la démo" : "Se déconnecter"} variant="danger" icon="log-out-outline" onPress={() => void signOut()} />
      <Text style={{ textAlign: "center", color: p.muted, fontSize: 12 }}>
        {BRAND.appName} · version {version} · {Platform.OS}
      </Text>
    </>
  );
}

/** Suppression du compte (exigée par l'App Store et le RGPD). */
function DeleteSection({ owner }: { owner: boolean }) {
  const p = usePalette();
  const { session, logout, ledger, syncNow } = useStore();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  // Un vendeur supprimé ne peut plus envoyer ses passages : ils seraient perdus.
  const unsent = owner ? 0 : ledger.pending.length;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function remove() {
    if (!session) return;
    setBusy(true);
    setError(undefined);
    try {
      if (!owner) await syncNow();
      await api.deleteAccount(session.token);
      await logout();
    } catch (e) {
      setError(toRemoteError(e).message);
      setBusy(false);
    }
  }

  return (
    <Section title="Zone sensible">
      {!open ? (
        <Row icon="trash-outline" title="Supprimer mon compte" subtitle={owner ? "Efface le commerce, la carte et tous les clients" : "Retire votre accès à cette boutique"} onPress={() => setOpen(true)} last />
      ) : (
        <View style={{ padding: space.lg, gap: space.md }}>
          <Text style={{ color: p.text, lineHeight: 21 }}>
            {owner
              ? "Votre commerce sera effacé définitivement : la carte de fidélité, vos clients et leurs tampons, les messages et les comptes de vos vendeurs. Les cartes installées dans le téléphone de vos clients ne fonctionneront plus. L'abonnement s'arrête aussitôt, sans autre prélèvement. Cette action est irréversible : si vous voulez garder la liste de vos clients, exportez-la d'abord (section « Données des clients »)."
              : "Votre accès à cette boutique sera supprimé et vous serez déconnecté. Les passages que vous avez enregistrés restent dans l'historique de la boutique. Pour revenir, le responsable devra vous inviter à nouveau."}
          </Text>
          <Field label="Tapez SUPPRIMER pour confirmer" value={typed} onChangeText={setTyped} autoCapitalize="characters" autoCorrect={false} />
          {unsent > 0 && (
            <Notice
              tone="error"
              text={`${plural(unsent, "passage n'est", "passages ne sont")} pas encore ${unsent > 1 ? "envoyés" : "envoyé"}. Connectez-vous à Internet pour ${unsent > 1 ? "les envoyer" : "l'envoyer"} avant de supprimer votre accès, sinon ${unsent > 1 ? "ils seront perdus" : "il sera perdu"}.`}
            />
          )}
          {error && <Notice tone="error" text={error} />}
          <Button label="Supprimer définitivement" variant="danger" icon="trash-outline" onPress={() => void remove()} loading={busy} disabled={typed.trim() !== "SUPPRIMER" || unsent > 0} />
          <Button label="Annuler" variant="secondary" onPress={() => { setOpen(false); setTyped(""); }} />
        </View>
      )}
    </Section>
  );
}
