// Chargement de données en ligne pour les écrans du responsable (clients, stats, messages…).
// Gère : chargement, erreur, hors ligne, session expirée, rechargement manuel.
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, AuthError, OfflineError, SubscriptionError } from "./api";
import { useStore } from "./store";

export type RemoteError = { kind: "offline" | "forbidden" | "other"; message: string };

export function toRemoteError(e: unknown): RemoteError {
  if (e instanceof OfflineError) return { kind: "offline", message: "Pas de connexion. Cet écran a besoin d'Internet." };
  if (e instanceof ApiError && e.status === 403) return { kind: "forbidden", message: e.message };
  return { kind: "other", message: e instanceof Error ? e.message : "Erreur inattendue" };
}

export function useRemote<T>(fetcher: (token: string) => Promise<T>, deps: unknown[] = []) {
  const { session, logout, markSubscriptionInactive } = useStore();
  const [data, setData] = useState<T>();
  const [error, setError] = useState<RemoteError>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const run = useCallback(
    async (mode: "initial" | "refresh") => {
      if (!session) return;
      if (mode === "refresh") setRefreshing(true);
      try {
        setData(await fetcherRef.current(session.token));
        setError(undefined);
      } catch (e) {
        if (e instanceof AuthError) return void logout();
        if (e instanceof SubscriptionError) return void markSubscriptionInactive();
        setError(toRemoteError(e));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [session, logout, markSubscriptionInactive],
  );

  useEffect(() => {
    // Lancement après l'affichage (pas de setState synchrone dans l'effet)
    const t = setTimeout(() => void run("initial"), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, ...deps]);

  return { data, error, loading, refreshing, reload: () => run("refresh"), setData };
}
