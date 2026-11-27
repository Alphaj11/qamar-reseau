// « Code oublié » : lien envoyé par e-mail, valable 30 minutes et une seule fois.
// - on ne garde que l'empreinte SHA-256 du lien (table pin_resets, ou mémoire sans Postgres) ;
// - une nouvelle demande n'annule pas les liens encore valables : quelqu'un qui connaît l'adresse
//   ne peut pas casser le lien que la personne est en train d'utiliser (la limite de 3 demandes
//   par heure et par adresse borne le nombre de liens) ;
// - utiliser un lien enregistre le nouveau code, coupe toutes les sessions du compte et annule les
//   liens plus anciens, le tout dans une seule transaction ;
// - changer son code depuis l'appli annule aussi tous les liens en cours ;
// - la réponse est la même que l'adresse existe ou non (on ne révèle pas qui a un compte).
import "server-only";
import crypto from "crypto";
import { hashPin, load, mutate, usingPostgres } from "./db";
import { BRAND } from "./brand";
import { escapeHtml, sendMail } from "./mail";
import { clearFailures } from "./staff";
import { withSecurityStore } from "./security-store";
import { pgTransaction } from "./db-postgres";
import { publicUrl } from "./wallet/config";
import { DEMO_STAFF } from "./showcase";

export const RESET_TTL_MIN = 30;
/** Verrou des écritures de load()/mutate() (voir db-postgres.ts) : on écrit le code au même rythme. */
const WRITE_LOCK = 7243002;
const memory = new Map<string, { staffId: string; created: number; expires: number; used: boolean }>();

const digest = (token: string) => crypto.createHash("sha256").update(token).digest("hex");
const wellFormed = (token: string) => /^[A-Za-z0-9_-]{43}$/.test(token);

/** Crée un lien pour cet e-mail s'il correspond à un compte, et l'envoie. Ne dit jamais si le compte existe. */
export async function requestPinReset(email: string): Promise<void> {
  const key = email.trim().toLowerCase();
  const staff = (await load()).staff.find((s) => s.email.toLowerCase() === key);
  if (!staff || staff.id === DEMO_STAFF || key.endsWith("@demo.test")) return;

  const token = crypto.randomBytes(32).toString("base64url");
  const hash = digest(token);
  await withSecurityStore(
    async (c) => {
      await c.query("delete from pin_resets where expires_at < now() - interval '1 day'");
      await c.query(
        "insert into pin_resets (token_hash, staff_id, expires_at) values ($1, $2, now() + make_interval(mins => $3))",
        [hash, staff.id, RESET_TTL_MIN],
      );
    },
    () => {
      const now = Date.now();
      for (const [k, v] of memory) if (v.expires < now) memory.delete(k);
      memory.set(hash, { staffId: staff.id, created: now, expires: now + RESET_TTL_MIN * 60_000, used: false });
    },
  );

  const link = `${publicUrl()}/code-oublie/${token}`;
  const sent = await sendMail({
    to: staff.email,
    subject: `${BRAND.name} : choisir un nouveau code`,
    text: `Bonjour ${staff.name},\n\nPour choisir un nouveau code de connexion, ouvrez ce lien (valable ${RESET_TTL_MIN} minutes, une seule fois) :\n${link}\n\nVous n'avez rien demandé ? Ignorez ce message : votre code actuel reste valable.\n\n${BRAND.name}`,
    html: `<p>Bonjour ${escapeHtml(staff.name)},</p><p>Pour choisir un nouveau code de connexion, ouvrez ce lien (valable ${RESET_TTL_MIN} minutes, une seule fois) :</p><p><a href="${escapeHtml(link)}">Choisir un nouveau code</a></p><p>Vous n'avez rien demandé ? Ignorez ce message : votre code actuel reste valable.</p><p>${escapeHtml(BRAND.name)}</p>`,
  });
  // Message non parti : le lien ne sert à personne, on le retire (les liens précédents restent valables)
  if (!sent) {
    await withSecurityStore(
      async (c) => void (await c.query("delete from pin_resets where token_hash = $1", [hash])),
      () => void memory.delete(hash),
    );
  }
}

/** Le lien est-il encore utilisable ? (affichage de la page, sans le consommer) */
export function pinResetValid(token: string): Promise<boolean> {
  if (!wellFormed(token)) return Promise.resolve(false);
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

/** Enregistre le nouveau code et coupe les sessions du compte. Renvoie false si le lien n'est plus valable. */
export async function completePinReset(token: string, pin: string): Promise<boolean> {
  if (!wellFormed(token)) return false;
  const hash = digest(token);
  const pinHash = hashPin(pin);
  let email: string | undefined;
  try {
    email = usingPostgres() ? await completePostgres(hash, pinHash) : await completeMemory(hash, pinHash);
  } catch (e) {
    // Table pin_resets pas encore créée (migration 0004) : les liens sont alors gardés en mémoire
    if ((e as { code?: string }).code !== "42P01") throw e;
    email = await completeMemory(hash, pinHash);
  }
  if (!email) return false;
  await clearFailures(email.toLowerCase());
  return true;
}

/**
 * Tout ou rien, dans une transaction : si l'écriture du code échoue, le lien n'est pas consommé
 * et reste utilisable. Les liens créés après celui-ci (demande en parallèle) ne sont pas touchés.
 */
function completePostgres(hash: string, pinHash: string) {
  return pgTransaction(async (c) => {
    await c.query("select pg_advisory_xact_lock($1)", [WRITE_LOCK]);
    const { rows } = await c.query<{ staff_id: string; created_at: Date }>(
      "update pin_resets set used_at = now() where token_hash = $1 and used_at is null and expires_at > now() returning staff_id, created_at",
      [hash],
    );
    const reset = rows[0];
    if (!reset) return undefined;
    const staff = await c.query<{ email: string }>("update staff set pin_hash = $1 where id = $2 returning email", [pinHash, reset.staff_id]);
    if (!staff.rows[0]) return undefined;
    await c.query("delete from sessions where staff_id = $1", [reset.staff_id]);
    await c.query("delete from pin_resets where staff_id = $1 and token_hash <> $2 and created_at <= $3", [reset.staff_id, hash, reset.created_at]);
    return staff.rows[0].email;
  });
}

async function completeMemory(hash: string, pinHash: string) {
  const hit = memory.get(hash);
  if (!hit || hit.used || hit.expires <= Date.now()) return undefined;
  const email = await mutate((db) => {
    const staff = db.staff.find((s) => s.id === hit.staffId);
    if (!staff) return undefined;
    staff.pinHash = pinHash;
    db.sessions = db.sessions.filter((s) => s.staffId !== hit.staffId);
    return staff.email;
  });
  if (!email) return undefined;
  hit.used = true;
  for (const [k, v] of memory) if (v.staffId === hit.staffId && k !== hash && v.created <= hit.created) memory.delete(k);
  return email;
}

/** Le code a été changé autrement (depuis l'appli) : les liens en cours ne doivent plus servir. */
export function revokePinResets(staffId: string): Promise<void> {
  return withSecurityStore(
    async (c) => void (await c.query("delete from pin_resets where staff_id = $1", [staffId])),
    () => {
      for (const [k, v] of memory) if (v.staffId === staffId) memory.delete(k);
    },
  );
}
