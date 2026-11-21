// Relance automatique des clients absents.
// Une fois par jour, chaque commerce qui l'a activée envoie un message sur la carte Wallet
// des clients qui ne sont pas venus depuis N jours (et qui ont accepté les offres).
// Un client n'est relancé qu'une fois par absence : il faut qu'il revienne pour pouvoir l'être à nouveau.
import "server-only";
import crypto from "crypto";
import { load, mutate, type DevDb } from "./db";
import { CAMPAIGNS_PER_DAY, requireOwner } from "./merchant";
import { isActive } from "./subscription";
import type { Program, Staff, WinbackSettings } from "./types";

const DAY = 86400_000;
/** Fenêtre pendant laquelle un retour en caisse est attribué à la relance. */
export const WINBACK_RETURN_DAYS = 14;

export const DEFAULT_WINBACK: WinbackSettings = {
  enabled: false,
  days: 30,
  message: "Ça fait un moment ! Nous serions ravis de vous revoir : passez nous dire bonjour.",
};

export const winbackOf = (p: Program): WinbackSettings => ({ ...DEFAULT_WINBACK, ...p.winback });

/** Dernière activité de chaque carte du programme : dernier passage (hors récompense) ou inscription. */
function lastActivity(db: DevDb, program: Program) {
  const cards = db.cards.filter((c) => c.programId === program.id);
  const last = new Map(cards.map((c) => [c.id, c.createdAt]));
  for (const t of db.transactions) {
    if (t.kind === "reward") continue;
    const cur = last.get(t.cardId);
    if (cur !== undefined && t.occurredAt > cur) last.set(t.cardId, t.occurredAt);
  }
  return { cards, last };
}

/** Clients absents depuis `days` jours, pas encore relancés depuis leur dernière visite. */
function absentCards(db: DevDb, program: Program, days: number, now: number) {
  const { cards, last } = lastActivity(db, program);
  const limit = new Date(now - days * DAY).toISOString();
  const lastWinback = new Map<string, string>();
  for (const w of db.winbacks) {
    if (w.programId !== program.id) continue;
    if ((lastWinback.get(w.cardId) ?? "") < w.sentAt) lastWinback.set(w.cardId, w.sentAt);
  }
  const consent = new Set(db.customers.filter((c) => c.marketingConsent).map((c) => c.id));
  const absent = cards.filter((c) => {
    const seen = last.get(c.id)!;
    if (seen >= limit) return false;
    const sent = lastWinback.get(c.id);
    return !sent || sent < seen;
  });
  return { reachable: absent.filter((c) => consent.has(c.customerId)), noConsent: absent.filter((c) => !consent.has(c.customerId)).length };
}

/** Écran de la relance : réglages, qui serait relancé aujourd'hui, résultats des 90 derniers jours. */
export async function winbackOverview(staff: Staff, now = Date.now()) {
  requireOwner(staff);
  const db = await load();
  const program = db.programs.find((p) => p.merchantId === staff.merchantId);
  if (!program) throw new Error("Aucun programme");
  const settings = winbackOf(program);
  const { reachable, noConsent } = absentCards(db, program, settings.days, now);
  const since = new Date(now - 90 * DAY).toISOString();
  const sent = db.winbacks.filter((w) => w.programId === program.id && w.sentAt >= since);
  const returned = sent.filter((w) => {
    const until = new Date(Date.parse(w.sentAt) + WINBACK_RETURN_DAYS * DAY).toISOString();
    return db.transactions.some((t) => t.cardId === w.cardId && t.kind !== "reward" && t.occurredAt > w.sentAt && t.occurredAt <= until);
  }).length;
  return {
    settings,
    /** Clients qui recevraient le message au prochain passage de la relance. */
    dueNow: reachable.length,
    /** Clients absents mais sans accord pour les offres : jamais relancés. */
    absentWithoutConsent: noConsent,
    last90Days: { sent: sent.length, returned },
    returnDays: WINBACK_RETURN_DAYS,
  };
}

export function updateWinback(staff: Staff, patch: Partial<WinbackSettings>) {
  requireOwner(staff);
  return mutate((db) => {
    const program = db.programs.find((p) => p.merchantId === staff.merchantId);
    if (!program) throw new Error("Aucun programme");
    program.winback = { ...winbackOf(program), ...patch };
    return program.winback;
  });
}

export interface WinbackBatch {
  programId: string;
  merchantName: string;
  message: string;
  serials: string[];
}

/**
 * Passage quotidien : relance les clients absents de tous les commerces abonnés qui l'ont activée.
 * Un commerce qui a déjà envoyé 3 messages dans les 24 h attend le lendemain (limite des téléphones).
 */
export function runWinback(now = Date.now(), skipSerials: ReadonlySet<string> = new Set()) {
  return mutate((db) => {
    const batches: WinbackBatch[] = [];
    const nowIso = new Date(now).toISOString();
    const dayAgo = new Date(now - DAY).toISOString();
    for (const program of db.programs) {
      const settings = winbackOf(program);
      if (!settings.enabled) continue;
      const merchant = db.merchants.find((m) => m.id === program.merchantId);
      if (!merchant || !isActive(merchant.subscription.status)) continue;
      const recent = db.campaigns.filter((c) => c.programId === program.id && c.createdAt >= dayAgo).length;
      if (recent >= CAMPAIGNS_PER_DAY) continue;
      // Les clients fêtés le même jour ne reçoivent pas un second message
      const reachable = absentCards(db, program, settings.days, now).reachable.filter((c) => !skipSerials.has(c.serial));
      if (!reachable.length) continue;
      for (const card of reachable) {
        card.lastMessage = settings.message;
        card.updatedAt = nowIso;
        db.winbacks.push({ id: crypto.randomUUID(), programId: program.id, cardId: card.id, sentAt: nowIso });
      }
      batches.push({ programId: program.id, merchantName: program.merchantName, message: settings.message, serials: reachable.map((c) => c.serial) });
    }
    return batches;
  });
}
