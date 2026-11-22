// Liens de téléchargement à usage unique (2 minutes). Gardés en mémoire, comme la limite d'essais :
// si l'hébergeur lance plusieurs serveurs, il faudra les déplacer dans la base (voir SECURITE.md, point 5).
import "server-only";
import crypto from "crypto";

const TTL_MS = 2 * 60_000;
const links = new Map<string, { session: string; expires: number }>();

export function issueDownloadToken(session: string) {
  const now = Date.now();
  for (const [k, v] of links) if (v.expires < now) links.delete(k);
  const token = crypto.randomBytes(24).toString("base64url");
  links.set(token, { session, expires: now + TTL_MS });
  return token;
}

/** Renvoie la session liée au lien et l'efface (un seul téléchargement). */
export function takeDownloadToken(token: string) {
  const hit = links.get(token);
  links.delete(token);
  return hit && hit.expires >= Date.now() ? hit.session : undefined;
}
