// « Code oublié » : lien envoyé par e-mail, valable 30 minutes et une seule fois.
// - on ne garde que l'empreinte SHA-256 du lien (table pin_resets, ou mémoire sans Postgres) ;
// - une nouvelle demande annule les liens précédents ;
// - le nouveau code coupe toutes les sessions ouvertes du compte et lève le blocage après codes faux ;
// - la réponse est la même que l'adresse existe ou non (on ne révèle pas qui a un compte).
import "server-only";
import crypto from "crypto";
import { hashPin, load, mutate } from "./db";
import { BRAND } from "./brand";
import { escapeHtml, sendMail } from "./mail";
import { clearFailures } from "./staff";
import { withSecurityStore } from "./security-store";
import { publicUrl } from "./wallet/config";
import { DEMO_STAFF } from "./showcase";

export const RESET_TTL_MIN = 30;
const memory = new Map<string, { staffId: string; expires: number; used: boolean }>();

const digest = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

/** Crée un lien pour cet e-mail s'il correspond à un compte, et l'envoie. Ne dit jamais si le compte existe. */
export async function requestPinReset(email: string): Promise<void> {
  const key = email.trim().toLowerCase();
  const staff = (await load()).staff.find((s) => s.email.toLowerCase() === key);
  if (!staff || staff.id === DEMO_STAFF || key.endsWith("@demo.test")) return;

  const token = crypto.randomBytes(32).toString("base64url");
  const hash = digest(token);
  await withSecurityStore(
    async (c) => {
      await c.query("delete from pin_resets where staff_id = $1 or expires_at < now() - interval '1 day'", [staff.id]);
      await c.query(
        "insert into pin_resets (token_hash, staff_id, expires_at) values ($1, $2, now() + make_interval(mins => $3))",
        [hash, staff.id, RESET_TTL_MIN],
      );
    },
    () => {
      const now = Date.now();
      for (const [k, v] of memory) if (v.staffId === staff.id || v.expires < now) memory.delete(k);
      memory.set(hash, { staffId: staff.id, expires: now + RESET_TTL_MIN * 60_000, used: false });
    },
  );

  const link = `${publicUrl()}/code-oublie/${token}`;
  await sendMail({
    to: staff.email,
    subject: `${BRAND.name} : choisir un nouveau code`,
    text: `Bonjour ${staff.name},\n\nPour choisir un nouveau code de connexion, ouvrez ce lien (valable ${RESET_TTL_MIN} minutes, une seule fois) :\n${link}\n\nVous n'avez rien demandé ? Ignorez ce message : votre code actuel reste valable.\n\n${BRAND.name}`,
    html: `<p>Bonjour ${escapeHtml(staff.name)},</p><p>Pour choisir un nouveau code de connexion, ouvrez ce lien (valable ${RESET_TTL_MIN} minutes, une seule fois) :</p><p><a href="${escapeHtml(link)}">Choisir un nouveau code</a></p><p>Vous n'avez rien demandé ? Ignorez ce message : votre code actuel reste valable.</p><p>${escapeHtml(BRAND.name)}</p>`,
  });
}

/** Le lien est-il encore utilisable ? (affichage de la page, sans le consommer) */
export function pinResetValid(token: string): Promise<boolean> {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return Promise.resolve(false);
  const hash = digest(token);
  return withSecurityStore(
    async (c) => {
      const { rows } = await c.query("select 1 from pin_resets where token_hash = $1 and used_at is null and expires_at > now()", [hash]);
      return rows.length > 0;
    },
    () => {
      const hit = memory.get(hash);
      return !!hit && !hit.used && hit.expires > Date.now();
    },
  );
}

/** Consomme le lien (une seule fois) et renvoie le compte concerné, ou undefined s'il est expiré ou déjà utilisé. */
function takePinReset(token: string): Promise<string | undefined> {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return Promise.resolve(undefined);
  const hash = digest(token);
  return withSecurityStore(
    async (c) => {
      const { rows } = await c.query<{ staff_id: string }>(
        "update pin_resets set used_at = now() where token_hash = $1 and used_at is null and expires_at > now() returning staff_id",
        [hash],
      );
      return rows[0]?.staff_id;
    },
    () => {
      const hit = memory.get(hash);
      if (!hit || hit.used || hit.expires <= Date.now()) return undefined;
      hit.used = true;
      return hit.staffId;
    },
  );
}

/** Enregistre le nouveau code, coupe les sessions du compte. Renvoie false si le lien n'est plus valable. */
export async function completePinReset(token: string, pin: string): Promise<boolean> {
  const staffId = await takePinReset(token);
  if (!staffId) return false;
  const email = await mutate((db) => {
    const staff = db.staff.find((s) => s.id === staffId);
    if (!staff) return undefined;
    staff.pinHash = hashPin(pin);
    db.sessions = db.sessions.filter((s) => s.staffId !== staffId);
    return staff.email;
  });
  if (!email) return false;
  await withSecurityStore(
    async (c) => void (await c.query("delete from pin_resets where staff_id = $1", [staffId])),
    () => {
      for (const [k, v] of memory) if (v.staffId === staffId) memory.delete(k);
    },
  );
  await clearFailures(email.toLowerCase());
  return true;
}
