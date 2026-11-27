// Liens de téléchargement à usage unique (2 minutes). En base Postgres quand elle est branchée
// (table download_tokens : le lien marche quel que soit le serveur qui répond), sinon en mémoire.
import "server-only";
import crypto from "crypto";
import { withSecurityStore } from "./security-store";

const TTL_MS = 2 * 60_000;
const links = new Map<string, { session: string; expires: number }>();

export function issueDownloadToken(session: string): Promise<string> {
  const token = crypto.randomBytes(24).toString("base64url");
  return withSecurityStore(
    async (c) => {
      await c.query("delete from download_tokens where expires_at < now()");
      await c.query("insert into download_tokens (token, session, expires_at) values ($1, $2, now() + make_interval(secs => $3))", [
        token,
        session,
        TTL_MS / 1000,
      ]);
      return token;
    },
    () => issueMemory(token, session),
  );
}

function issueMemory(token: string, session: string) {
  const now = Date.now();
  for (const [k, v] of links) if (v.expires < now) links.delete(k);
  links.set(token, { session, expires: now + TTL_MS });
  return token;
}

/** Renvoie la session liée au lien et l'efface (un seul téléchargement). */
export function takeDownloadToken(token: string): Promise<string | undefined> {
  return withSecurityStore(
    async (c) => {
      const { rows } = await c.query<{ session: string; valid: boolean }>(
        "delete from download_tokens where token = $1 returning session, expires_at >= now() as valid",
        [token],
      );
      return rows[0]?.valid ? rows[0].session : undefined;
    },
    () => takeMemory(token),
  );
}

function takeMemory(token: string) {
  const hit = links.get(token);
  links.delete(token);
  return hit && hit.expires >= Date.now() ? hit.session : undefined;
}
