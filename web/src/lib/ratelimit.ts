// Limite d'essais (fenêtre glissante simple). En base Postgres quand elle est branchée (table rate_hits),
// donc partagée entre tous les serveurs ; sinon en mémoire du serveur (développement).
import "server-only";
import { withSecurityStore } from "./security-store";

const buckets = new Map<string, number[]>();
const LOOPBACK = /:(::1|127\.0\.0\.1|::ffff:127\.0\.0\.1|inconnue)$/;

/**
 * Enregistre un essai pour `key` et indique s'il dépasse `max` essais sur `windowMs`.
 * Renvoie le nombre de secondes à attendre si la limite est atteinte, sinon 0.
 */
export async function hit(key: string, max: number, windowMs: number): Promise<number> {
  // En développement seulement, l'ordinateur du développeur n'est pas limité (tests automatiques répétés)
  if (process.env.NODE_ENV === "development" && LOOPBACK.test(key)) return 0;
  return withSecurityStore(
    async (c) => {
      // Un seul calcul à la fois par clé : deux essais simultanés ne passent pas tous les deux
      await c.query("select pg_advisory_xact_lock(hashtext($1))", [key]);
      // statement_timestamp() et non now() : now() reste figé au début de la transaction, avant l'attente du verrou
      await c.query("delete from rate_hits where key = $1 and at <= statement_timestamp() - make_interval(secs => $2)", [key, windowMs / 1000]);
      const { rows } = await c.query<{ n: number; wait: number | null }>(
        "select count(*)::int as n, ceil(extract(epoch from (min(at) + make_interval(secs => $2) - statement_timestamp())))::int as wait from rate_hits where key = $1",
        [key, windowMs / 1000],
      );
      if (rows[0].n >= max) return Math.max(1, rows[0].wait ?? 1);
      await c.query("insert into rate_hits (key, at) values ($1, statement_timestamp())", [key]);
      // Ménage de temps en temps des clés mortes (plus d'un jour)
      if (Math.random() < 0.01) await c.query("delete from rate_hits where at < now() - interval '1 day'");
      return 0;
    },
    () => hitMemory(key, max, windowMs),
  );
}

function hitMemory(key: string, max: number, windowMs: number, now = Date.now()): number {
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    buckets.set(key, recent);
    return Math.ceil((windowMs - (now - recent[0])) / 1000);
  }
  recent.push(now);
  buckets.set(key, recent);
  // Ménage de temps en temps pour ne pas garder des clés mortes
  if (buckets.size > 10_000) {
    for (const [k, v] of buckets) if (!v.some((t) => now - t < windowMs)) buckets.delete(k);
  }
  return 0;
}

/** Adresse IP du visiteur (derrière Vercel / un proxy : première adresse de x-forwarded-for). */
export function clientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "inconnue";
}

export const tooMany = (seconds: number) =>
  `Trop d'essais. Réessayez dans ${seconds < 60 ? `${seconds} s` : `${Math.ceil(seconds / 60)} min`}.`;
