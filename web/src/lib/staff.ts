// Logique "caisse" utilisée par l'appli commerçant : connexion, recherche de carte,
// application des passages (tampons, points, récompenses) avec anti-doublon.
import "server-only";
import crypto from "crypto";
import { load, mutate, verifyPin, type DevDb } from "./db";
import { maybeAskReview } from "./review";
import { subscriptionView } from "./subscription";
import type { Card, Program, Staff, TransactionKind } from "./types";
import { DEMO_STAFF } from "./showcase";

const SESSION_DAYS = 30;

// Anti-essais : 5 codes faux de suite → compte bloqué 15 min (mémoire du serveur ;
// à déplacer en base avec Supabase pour tenir sur plusieurs serveurs).
const MAX_FAILS = 5;
const LOCK_MS = 15 * 60_000;
const failures = new Map<string, { count: number; lockedUntil: number }>();

export class LockedError extends Error {}

/** Ce que l'appli reçoit pour une carte : de quoi l'afficher et la mettre à jour hors ligne. */
export interface StaffCardView {
  serial: string;
  firstName: string;
  programId: string;
  stamps: number;
  points: number;
  rewardsAvailable: number;
  updatedAt: string;
}

export interface StaffProgramView {
  id: string;
  name: string;
  merchantName: string;
  type: Program["type"];
  rewardLabel: string;
  stampsRequired: number;
  pointsRequired: number;
  pointsPerEuro: number;
  bgColor: string;
  fgColor: string;
  accentColor: string;
  stampIcon: Program["stampIcon"];
  pattern?: boolean;
  logo?: string;
  banner?: string;
  labelColor?: string;
}

export interface SyncOp {
  clientOpId: string;
  serial: string;
  kind: TransactionKind;
  amount: number;
  occurredAt: string;
}

export type SyncResult =
  | { clientOpId: string; status: "applied" | "duplicate"; card: StaffCardView }
  | { clientOpId: string; status: "rejected"; reason: string; card?: StaffCardView };

function cardView(db: DevDb, card: Card): StaffCardView {
  const customer = db.customers.find((c) => c.id === card.customerId);
  return {
    serial: card.serial,
    firstName: customer?.firstName ?? "Client",
    programId: card.programId,
    stamps: card.stamps,
    points: card.points,
    rewardsAvailable: card.rewardsAvailable,
    updatedAt: card.updatedAt,
  };
}

function programView(p: Program): StaffProgramView {
  const { id, name, merchantName, type, rewardLabel, stampsRequired, pointsRequired, pointsPerEuro, bgColor, fgColor, accentColor, stampIcon, pattern, logo, banner, labelColor } = p;
  return { id, name, merchantName, type, rewardLabel, stampsRequired, pointsRequired, pointsPerEuro, bgColor, fgColor, accentColor, stampIcon, pattern, logo, banner, labelColor };
}

/**
 * Règle métier d'un passage. Même règle dans l'appli (mobile/src/rules.ts)
 * pour afficher le résultat immédiatement, même hors ligne.
 */
export function applyRule(
  card: Pick<Card, "stamps" | "points" | "rewardsAvailable" | "rewardsRedeemed">,
  program: Pick<Program, "type" | "stampsRequired" | "pointsRequired">,
  kind: TransactionKind,
  amount: number,
): { ok: true } | { ok: false; reason: string } {
  if (kind === "reward") {
    if (card.rewardsAvailable < 1) return { ok: false, reason: "Aucune récompense disponible" };
    card.rewardsAvailable -= 1;
    card.rewardsRedeemed += 1;
    return { ok: true };
  }
  if (!Number.isInteger(amount) || amount < 1 || amount > 10000) {
    return { ok: false, reason: "Quantité invalide" };
  }
  if (kind === "stamp") {
    if (program.type !== "stamps") return { ok: false, reason: "Ce programme fonctionne en points" };
    card.stamps += amount;
    while (card.stamps >= program.stampsRequired) {
      card.stamps -= program.stampsRequired;
      card.rewardsAvailable += 1;
    }
    return { ok: true };
  }
  if (program.type !== "points") return { ok: false, reason: "Ce programme fonctionne en tampons" };
  card.points += amount;
  while (card.points >= program.pointsRequired) {
    card.points -= program.pointsRequired;
    card.rewardsAvailable += 1;
  }
  return { ok: true };
}

export async function login(email: string, pin: string) {
  const key = email.trim().toLowerCase();
  const f = failures.get(key);
  if (f && f.lockedUntil > Date.now()) {
    throw new LockedError(`Trop d'essais. Réessayez dans ${Math.ceil((f.lockedUntil - Date.now()) / 60_000)} min.`);
  }
  return mutate((db) => {
    const staff = db.staff.find((s) => s.email.toLowerCase() === key);
    if (!staff || !verifyPin(pin, staff.pinHash)) {
      // Après un blocage expiré, on repart de zéro
      const count = (f && f.lockedUntil === 0 ? f.count : 0) + 1;
      failures.set(key, count >= MAX_FAILS ? { count: 0, lockedUntil: Date.now() + LOCK_MS } : { count, lockedUntil: 0 });
      return undefined;
    }
    failures.delete(key);
    const token = crypto.randomBytes(32).toString("base64url");
    db.sessions.push({ token, staffId: staff.id, createdAt: new Date().toISOString() });
    const merchant = db.merchants.find((m) => m.id === staff.merchantId);
    return {
      token,
      staff: { id: staff.id, name: staff.name, merchantId: staff.merchantId, role: staff.role },
      subscription: merchant ? subscriptionView(merchant) : undefined,
    };
  });
}

/** Retrouve le vendeur à partir de l'en-tête "Authorization: Bearer <token>". */
export async function authenticate(request: Request): Promise<Staff | undefined> {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return undefined;
  const db = await load();
  const session = db.sessions.find((s) => s.token === token);
  if (!session) return undefined;
  const maxAge = session.staffId === DEMO_STAFF ? 86400_000 : SESSION_DAYS * 86400_000;
  if (Date.now() - Date.parse(session.createdAt) > maxAge) return undefined;
  return db.staff.find((s) => s.id === session.staffId);
}

/** Tout ce dont l'appli a besoin pour fonctionner hors ligne : programmes et cartes du commerçant. */
export async function snapshot(staff: Staff) {
  const db = await load();
  const programs = db.programs.filter((p) => p.merchantId === staff.merchantId);
  const ids = new Set(programs.map((p) => p.id));
  const merchant = db.merchants.find((m) => m.id === staff.merchantId);
  return {
    merchantName: programs[0]?.merchantName ?? "",
    subscription: merchant ? subscriptionView(merchant) : undefined,
    programs: programs.map(programView),
    cards: db.cards.filter((c) => ids.has(c.programId)).map((c) => cardView(db, c)),
    serverTime: new Date().toISOString(),
  };
}

export async function findCard(staff: Staff, serial: string) {
  const db = await load();
  const card = db.cards.find((c) => c.serial === serial);
  const program = card && db.programs.find((p) => p.id === card.programId);
  if (!card || !program || program.merchantId !== staff.merchantId) return undefined;
  return cardView(db, card);
}

/** Applique une liste de passages, dans l'ordre, en ignorant ceux déjà reçus. */
/** Message à envoyer en notification après la synchro (ex. demande d'avis). */
export interface SyncMessage {
  serial: string;
  header: string;
  body: string;
}

export async function sync(staff: Staff, ops: SyncOp[]): Promise<{ results: SyncResult[]; messages: SyncMessage[] }> {
  return mutate((db) => {
    const seen = new Set(db.transactions.map((t) => t.clientOpId));
    const messages: SyncMessage[] = [];
    const results = ops.map((op): SyncResult => {
      const card = db.cards.find((c) => c.serial === op.serial);
      const program = card && db.programs.find((p) => p.id === card.programId);
      if (!card || !program || program.merchantId !== staff.merchantId) {
        return { clientOpId: op.clientOpId, status: "rejected", reason: "Carte inconnue" };
      }
      if (seen.has(op.clientOpId)) {
        return { clientOpId: op.clientOpId, status: "duplicate", card: cardView(db, card) };
      }
      const amount = op.kind === "reward" ? 1 : op.amount;
      const result = applyRule(card, program, op.kind, amount);
      if (!result.ok) {
        return { clientOpId: op.clientOpId, status: "rejected", reason: result.reason, card: cardView(db, card) };
      }
      const now = new Date().toISOString();
      card.updatedAt = now;
      db.transactions.push({
        id: crypto.randomUUID(),
        cardId: card.id,
        staffId: staff.id,
        kind: op.kind,
        amount,
        clientOpId: op.clientOpId,
        occurredAt: op.occurredAt,
        createdAt: now,
      });
      seen.add(op.clientOpId);
      if (op.kind !== "reward") {
        const body = maybeAskReview(db, card, program, now);
        if (body) messages.push({ serial: card.serial, header: program.merchantName, body });
      }
      return { clientOpId: op.clientOpId, status: "applied", card: cardView(db, card) };
    });
    return { results, messages };
  });
}
