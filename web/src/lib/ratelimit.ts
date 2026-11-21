// Limite d'essais en mémoire du serveur (fenêtre glissante simple).
// Suffisant sur un seul serveur ; avec plusieurs instances, déplacer les compteurs en base (Supabase) ou Upstash.
import "server-only";

const buckets = new Map<string, number[]>();
const LOOPBACK = /:(::1|127\.0\.0\.1|::ffff:127\.0\.0\.1|inconnue)$/;

/**
 * Enregistre un essai pour `key` et indique s'il dépasse `max` essais sur `windowMs`.
 * Renvoie le nombre de secondes à attendre si la limite est atteinte, sinon 0.
 */
export function hit(key: string, max: number, windowMs: number, now = Date.now()): number {
  // En développement seulement, l'ordinateur du développeur n'est pas limité (tests automatiques répétés)
  if (process.env.NODE_ENV === "development" && LOOPBACK.test(key)) return 0;
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
