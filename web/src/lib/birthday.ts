// Offre d'anniversaire : le jour de son anniversaire, le client reçoit un message sur sa carte
// et, si le commerçant le souhaite, une récompense offerte (utilisable en caisse comme les autres).
// Le client donne seulement le jour et le mois, à l'inscription et s'il le veut : c'est ce qui vaut accord
// pour ce message. Un client n'est fêté qu'une fois par an.
import "server-only";
import { load, mutate, type DevDb } from "./db";
import { requireOwner } from "./merchant";
import { isActive } from "./subscription";
import type { BirthdaySettings, Program, Staff } from "./types";

export const DEFAULT_BIRTHDAY: BirthdaySettings = {
  enabled: false,
  gift: true,
  message: "Joyeux anniversaire ! Un cadeau vous attend chez nous : montrez votre carte en caisse.",
};

export const birthdayOf = (p: Program): BirthdaySettings => ({ ...DEFAULT_BIRTHDAY, ...p.birthday });

const dayFmt = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Paris" });
/** "2026-11-20" en heure de Paris. */
const parisDate = (now: number) => dayFmt.format(new Date(now));

const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

/** Valide un anniversaire au format "MM-JJ" (le 29 février est accepté). */
export function isValidBirthday(mmdd: string) {
  const m = /^(\d{2})-(\d{2})$/.exec(mmdd);
  if (!m) return false;
  const month = Number(m[1]);
  const day = Number(m[2]);
  if (month < 1 || month > 12 || day < 1) return false;
  return day <= new Date(Date.UTC(2024, month, 0)).getUTCDate(); // 2024 : année bissextile
}

/** Les personnes nées un 29 février sont fêtées le 28 les années non bissextiles. */
export function isBirthdayOn(mmdd: string, date: string) {
  const year = Number(date.slice(0, 4));
  const today = date.slice(5);
  return mmdd === today || (mmdd === "02-29" && !isLeap(year) && today === "02-28");
}

function birthdayCards(db: DevDb, program: Program) {
  const birthdays = new Map(db.customers.filter((c) => c.birthday).map((c) => [c.id, c.birthday!]));
  return db.cards
    .filter((c) => c.programId === program.id && birthdays.has(c.customerId))
    .map((card) => ({ card, birthday: birthdays.get(card.customerId)! }));
}

export async function birthdayOverview(staff: Staff, now = Date.now()) {
  requireOwner(staff);
  const db = await load();
  const program = db.programs.find((p) => p.merchantId === staff.merchantId);
  if (!program) throw new Error("Aucun programme");
  const list = birthdayCards(db, program);
  const date = parisDate(now);
  const month = date.slice(5, 7);
  const year = Number(date.slice(0, 4));
  return {
    settings: birthdayOf(program),
    /** Clients qui ont donné leur date d'anniversaire. */
    known: list.length,
    thisMonth: list.filter((x) => x.birthday.slice(0, 2) === month).length,
    celebratedThisYear: list.filter((x) => x.card.birthdayYear === year).length,
  };
}

export function updateBirthday(staff: Staff, patch: Partial<BirthdaySettings>) {
  requireOwner(staff);
  return mutate((db) => {
    const program = db.programs.find((p) => p.merchantId === staff.merchantId);
    if (!program) throw new Error("Aucun programme");
    program.birthday = { ...birthdayOf(program), ...patch };
    return program.birthday;
  });
}

export interface BirthdayBatch {
  merchantName: string;
  message: string;
  serials: string[];
}

/** Passage quotidien : fête les clients dont c'est l'anniversaire aujourd'hui (heure de Paris). */
export function runBirthdays(now = Date.now()) {
  return mutate((db) => {
    const date = parisDate(now);
    const year = Number(date.slice(0, 4));
    const nowIso = new Date(now).toISOString();
    const batches: BirthdayBatch[] = [];
    for (const program of db.programs) {
      const settings = birthdayOf(program);
      if (!settings.enabled) continue;
      const merchant = db.merchants.find((m) => m.id === program.merchantId);
      if (!merchant || !isActive(merchant.subscription.status)) continue;
      const due = birthdayCards(db, program).filter((x) => isBirthdayOn(x.birthday, date) && x.card.birthdayYear !== year);
      if (!due.length) continue;
      for (const { card } of due) {
        if (settings.gift) card.rewardsAvailable += 1;
        card.lastMessage = settings.message;
        card.birthdayYear = year;
        card.updatedAt = nowIso;
      }
      batches.push({ merchantName: program.merchantName, message: settings.message, serials: due.map((x) => x.card.serial) });
    }
    return batches;
  });
}
