// Fonctions "patron" de l'appli commerçant : clients, historique, statistiques,
// réglages de la carte et messages aux clients.
import "server-only";
import crypto from "crypto";
import { hashPin, load, mutate, verifyPin, type DevDb } from "./db";
import type { Campaign, Program, Staff, StoreLocation, Transaction } from "./types";

/** Limite de messages : Google n'affiche que 3 notifications par carte et par 24 h. */
export const CAMPAIGNS_PER_DAY = 3;

export class ForbiddenError extends Error {}
export class RuleError extends Error {}

export function requireOwner(staff: Staff) {
  if (staff.role !== "owner") throw new ForbiddenError("Réservé au responsable de la boutique");
}

/** Pour l'instant : un programme par commerce. */
function programOf(db: DevDb, staff: Staff): Program {
  const p = db.programs.find((x) => x.merchantId === staff.merchantId);
  if (!p) throw new RuleError("Aucun programme pour ce commerce");
  return p;
}

// ——— Clients ———

export interface CustomerRow {
  serial: string;
  firstName: string;
  email?: string;
  phone?: string;
  marketingConsent: boolean;
  birthday?: string;
  stamps: number;
  points: number;
  rewardsAvailable: number;
  rewardsRedeemed: number;
  visits: number;
  lastVisitAt?: string;
  createdAt: string;
  inAppleWallet: boolean;
}

function rows(db: DevDb, program: Program): CustomerRow[] {
  const tx = new Map<string, Transaction[]>();
  for (const t of db.transactions) {
    const list = tx.get(t.cardId) ?? [];
    list.push(t);
    tx.set(t.cardId, list);
  }
  const apple = new Set(db.appleRegistrations.map((r) => r.serial));
  return db.cards
    .filter((c) => c.programId === program.id)
    .map((c) => {
      const customer = db.customers.find((x) => x.id === c.customerId);
      const list = tx.get(c.id) ?? [];
      const visits = list.filter((t) => t.kind !== "reward");
      return {
        serial: c.serial,
        firstName: customer?.firstName ?? "Client",
        email: customer?.email,
        phone: customer?.phone,
        marketingConsent: customer?.marketingConsent ?? false,
        birthday: customer?.birthday,
        stamps: c.stamps,
        points: c.points,
        rewardsAvailable: c.rewardsAvailable,
        rewardsRedeemed: c.rewardsRedeemed,
        visits: visits.length,
        lastVisitAt: visits.reduce<string | undefined>((m, t) => (!m || t.occurredAt > m ? t.occurredAt : m), undefined),
        createdAt: c.createdAt,
        inAppleWallet: apple.has(c.serial),
      };
    });
}

export async function listCustomers(staff: Staff, query = "") {
  const db = await load();
  const q = query.trim().toLowerCase();
  return rows(db, programOf(db, staff))
    .filter(
      (r) =>
        !q ||
        r.firstName.toLowerCase().includes(q) ||
        r.email?.includes(q) ||
        r.phone?.includes(q.replace(/\s/g, "")) ||
        r.serial.toLowerCase() === q,
    )
    .sort((a, b) => (b.lastVisitAt ?? b.createdAt).localeCompare(a.lastVisitAt ?? a.createdAt));
}

export async function customerDetail(staff: Staff, serial: string) {
  const db = await load();
  const program = programOf(db, staff);
  const row = rows(db, program).find((r) => r.serial === serial);
  if (!row) return undefined;
  const card = db.cards.find((c) => c.serial === serial)!;
  const names = new Map(db.staff.map((s) => [s.id, s.name]));
  const history = db.transactions
    .filter((t) => t.cardId === card.id)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .slice(0, 50)
    .map((t) => ({ kind: t.kind, amount: t.amount, occurredAt: t.occurredAt, by: names.get(t.staffId) ?? "—" }));
  return { customer: row, history };
}

// ——— Dates (heure de Paris) ———

const dayFmt = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Paris" });
const hourFmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", hour: "2-digit", hourCycle: "h23" });
/** "2026-11-19" en heure de Paris. */
export const parisDay = (d: string | number | Date) => dayFmt.format(new Date(d));
const parisHour = (iso: string) => Number(hourFmt.format(new Date(iso)));
/** 0 = lundi … 6 = dimanche. */
const parisWeekday = (iso: string) => (new Date(`${parisDay(iso)}T12:00:00Z`).getUTCDay() + 6) % 7;

function programTx(db: DevDb, program: Program) {
  const cardIds = new Set(db.cards.filter((c) => c.programId === program.id).map((c) => c.id));
  return db.transactions.filter((t) => cardIds.has(t.cardId));
}

// ——— Accueil ———

export async function home(staff: Staff) {
  const db = await load();
  const program = programOf(db, staff);
  const tx = programTx(db, program);
  const cards = db.cards.filter((c) => c.programId === program.id);
  const today = parisDay(Date.now());
  const yesterday = parisDay(Date.now() - 86400_000);
  const visitsOn = (day: string) => tx.filter((t) => t.kind !== "reward" && parisDay(t.occurredAt) === day).length;
  const names = new Map(db.staff.map((s) => [s.id, s.name]));
  const cardById = new Map(cards.map((c) => [c.id, c]));
  const customerName = (cardId: string) => {
    const card = cardById.get(cardId);
    return db.customers.find((c) => c.id === card?.customerId)?.firstName ?? "Client";
  };
  const recent = [...tx]
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .slice(0, 8)
    .map((t) => ({
      id: t.id,
      serial: cardById.get(t.cardId)?.serial ?? "",
      firstName: customerName(t.cardId),
      kind: t.kind,
      amount: t.amount,
      occurredAt: t.occurredAt,
      by: names.get(t.staffId) ?? "—",
    }));
  return {
    merchantName: program.merchantName,
    slug: program.slug,
    programType: program.type,
    today: {
      visits: visitsOn(today),
      newCustomers: cards.filter((c) => parisDay(c.createdAt) === today).length,
      rewardsRedeemed: tx.filter((t) => t.kind === "reward" && parisDay(t.occurredAt) === today).length,
    },
    yesterday: { visits: visitsOn(yesterday) },
    customers: cards.length,
    rewardsPending: cards.reduce((s, c) => s + c.rewardsAvailable, 0),
    recent,
    // Premiers pas : guide le commerçant tant que tout n'est pas fait
    onboarding: {
      customized: !!program.customizedAt,
      location: (program.locations?.length ?? 0) > 0,
      firstCustomer: cards.length > 0,
      firstVisit: tx.length > 0,
    },
  };
}

// ——— Statistiques ———

function periodFigures(db: DevDb, program: Program, from: string, to: string) {
  const tx = programTx(db, program).filter((t) => t.occurredAt >= from && t.occurredAt < to);
  const visits = tx.filter((t) => t.kind !== "reward");
  return {
    tx,
    visits,
    figures: {
      visits: visits.length,
      activeCustomers: new Set(visits.map((t) => t.cardId)).size,
      newCustomers: db.cards.filter((c) => c.programId === program.id && c.createdAt >= from && c.createdAt < to).length,
      rewardsRedeemed: tx.filter((t) => t.kind === "reward").length,
    },
  };
}

export async function stats(staff: Staff, days = 30) {
  const db = await load();
  const program = programOf(db, staff);
  const all = rows(db, program);
  const now = Date.now();
  const iso = (ms: number) => new Date(ms).toISOString();
  const since = iso(now - days * 86400_000);
  const current = periodFigures(db, program, since, iso(now + 60_000));
  const previous = periodFigures(db, program, iso(now - 2 * days * 86400_000), since);
  const { tx, visits } = current;

  // Passages par jour sur 14 jours (du plus ancien au plus récent)
  const daily: { date: string; visits: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = parisDay(now - i * 86400_000);
    daily.push({ date: d, visits: visits.filter((t) => parisDay(t.occurredAt) === d).length });
  }
  const byWeekday = Array.from({ length: 7 }, () => 0);
  const byHour = Array.from({ length: 24 }, () => 0);
  for (const t of visits) {
    byWeekday[parisWeekday(t.occurredAt)]++;
    byHour[parisHour(t.occurredAt)]++;
  }

  const perCard = new Map<string, number>();
  for (const t of visits) perCard.set(t.cardId, (perCard.get(t.cardId) ?? 0) + 1);
  const cardById = new Map(db.cards.map((c) => [c.id, c]));
  const topCustomers = [...perCard.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cardId, n]) => {
      const serial = cardById.get(cardId)?.serial ?? "";
      return { serial, firstName: all.find((r) => r.serial === serial)?.firstName ?? "Client", visits: n };
    });

  const visited = all.filter((r) => r.visits > 0);
  const inactiveSince = iso(now - 30 * 86400_000);
  const allTx = programTx(db, program);
  const campaigns = db.campaigns
    .filter((c) => c.programId === program.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5)
    .map((c) => {
      const ids = new Set(c.cardIds ?? []);
      const until = iso(Date.parse(c.createdAt) + 7 * 86400_000);
      const returned = new Set(
        allTx
          .filter((t) => ids.has(t.cardId) && t.kind !== "reward" && t.occurredAt > c.createdAt && t.occurredAt <= until)
          .map((t) => t.cardId),
      ).size;
      return { id: c.id, message: c.message, createdAt: c.createdAt, recipients: c.recipients, returned };
    });

  return {
    periodDays: days,
    ...current.figures,
    previous: previous.figures,
    customers: all.length,
    stampsGiven: tx.filter((t) => t.kind === "stamp").reduce((s, t) => s + t.amount, 0),
    pointsGiven: tx.filter((t) => t.kind === "points").reduce((s, t) => s + t.amount, 0),
    rewardsPending: all.reduce((s, r) => s + r.rewardsAvailable, 0),
    /** Part des clients venus au moins une fois qui sont revenus (2 passages ou plus). */
    returningRate: visited.length ? Math.round((visited.filter((r) => r.visits >= 2).length / visited.length) * 100) : null,
    avgVisitsPerActive: current.figures.activeCustomers
      ? Math.round((visits.length / current.figures.activeCustomers) * 10) / 10
      : null,
    /** Clients sans passage depuis 30 jours (à relancer). */
    inactiveCustomers: all.filter((r) => (r.lastVisitAt ?? r.createdAt) < inactiveSince).length,
    averageBasket: program.averageBasket ?? null,
    estimatedRevenue: program.averageBasket ? Math.round(visits.length * program.averageBasket) : null,
    optIn: all.filter((r) => r.marketingConsent).length,
    inAppleWallet: all.filter((r) => r.inAppleWallet).length,
    googleLinks: db.cards.filter((c) => c.programId === program.id && c.googleObjectId).length,
    daily,
    byWeekday,
    byHour,
    topCustomers,
    campaigns,
  };
}

// ——— Réglages de la carte ———

export type ProgramSettings = Pick<
  Program,
  | "name"
  | "merchantName"
  | "type"
  | "rewardLabel"
  | "stampsRequired"
  | "pointsRequired"
  | "pointsPerEuro"
  | "welcomeBonus"
  | "bgColor"
  | "fgColor"
  | "accentColor"
  | "stampIcon"
  | "terms"
  | "template"
  | "pattern"
> & { slug: string; locations: StoreLocation[]; averageBasket?: number; logo?: string };

function settingsOf(p: Program): ProgramSettings {
  return {
    slug: p.slug,
    name: p.name,
    merchantName: p.merchantName,
    type: p.type,
    rewardLabel: p.rewardLabel,
    stampsRequired: p.stampsRequired,
    pointsRequired: p.pointsRequired,
    pointsPerEuro: p.pointsPerEuro,
    welcomeBonus: p.welcomeBonus,
    bgColor: p.bgColor,
    fgColor: p.fgColor,
    accentColor: p.accentColor,
    stampIcon: p.stampIcon,
    template: p.template,
    pattern: p.pattern,
    logo: p.logo,
    terms: p.terms,
    locations: p.locations ?? [],
    averageBasket: p.averageBasket,
  };
}

export async function getSettings(staff: Staff) {
  const db = await load();
  return settingsOf(programOf(db, staff));
}

/**
 * Met à jour la carte. Renvoie les numéros de cartes à rafraîchir dans les Wallet.
 * Le type (tampons/points) ne peut changer que tant qu'aucun client n'est inscrit.
 */
/** Logo du commerce (data URL PNG déjà redimensionnée) ; `undefined` pour revenir à l'initiale. */
export function setLogo(staff: Staff, logo: string | undefined) {
  requireOwner(staff);
  return mutate((db) => {
    const p = programOf(db, staff);
    p.logo = logo;
    const now = new Date().toISOString();
    p.customizedAt ??= now;
    const cards = db.cards.filter((c) => c.programId === p.id);
    for (const c of cards) c.updatedAt = now;
    return { settings: settingsOf(p), serials: cards.map((c) => c.serial), program: p };
  });
}

export function updateSettings(staff: Staff, patch: Partial<Omit<ProgramSettings, "slug" | "logo">>) {
  requireOwner(staff);
  return mutate((db) => {
    const p = programOf(db, staff);
    const cards = db.cards.filter((c) => c.programId === p.id);
    if (patch.type && patch.type !== p.type && cards.length) {
      throw new RuleError("Impossible de passer de tampons à points : des clients ont déjà une carte");
    }
    if (patch.stampsRequired && patch.stampsRequired < p.stampsRequired && cards.some((c) => c.stamps >= patch.stampsRequired!)) {
      throw new RuleError("Des clients ont déjà plus de tampons que ce nouveau total");
    }
    Object.assign(p, patch);
    const now = new Date().toISOString();
    // Le panier moyen ne change rien sur les cartes des clients
    if (Object.keys(patch).every((k) => k === "averageBasket")) {
      return { settings: settingsOf(p), serials: [] as string[], program: p };
    }
    p.customizedAt ??= now;
    // Les cartes doivent être régénérées (couleurs, textes…) : on marque la date
    for (const c of cards) c.updatedAt = now;
    return { settings: settingsOf(p), serials: cards.map((c) => c.serial), program: p };
  });
}

// ——— Messages ———

export async function listCampaigns(staff: Staff) {
  const db = await load();
  const p = programOf(db, staff);
  return db.campaigns.filter((c) => c.programId === p.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Envoie un message à tous les clients qui ont accepté les offres. */
export function sendCampaign(staff: Staff, message: string) {
  requireOwner(staff);
  return mutate((db) => {
    const p = programOf(db, staff);
    const dayAgo = new Date(Date.now() - 86400_000).toISOString();
    const recent = db.campaigns.filter((c) => c.programId === p.id && c.createdAt >= dayAgo).length;
    if (recent >= CAMPAIGNS_PER_DAY) {
      throw new RuleError(`Maximum ${CAMPAIGNS_PER_DAY} messages par 24 h (au-delà, les téléphones ne notifient plus)`);
    }
    const consenting = new Set(db.customers.filter((c) => c.marketingConsent).map((c) => c.id));
    const cards = db.cards.filter((c) => c.programId === p.id && consenting.has(c.customerId));
    const now = new Date().toISOString();
    for (const c of cards) {
      c.lastMessage = message;
      c.updatedAt = now;
    }
    const campaign: Campaign = {
      id: crypto.randomUUID(),
      programId: p.id,
      message,
      createdBy: staff.id,
      createdAt: now,
      sentAt: now,
      recipients: cards.length,
      cardIds: cards.map((c) => c.id),
    };
    db.campaigns.push(campaign);
    return { campaign, serials: cards.map((c) => c.serial), merchantName: p.merchantName };
  });
}

// ——— Clients : suppression (RGPD) et export ———

/** Supprime un client et toutes ses données (droit à l'effacement). */
export function deleteCustomer(staff: Staff, serial: string) {
  requireOwner(staff);
  return mutate((db) => {
    const p = programOf(db, staff);
    const card = db.cards.find((c) => c.serial === serial && c.programId === p.id);
    if (!card) return false;
    db.cards = db.cards.filter((c) => c.id !== card.id);
    db.transactions = db.transactions.filter((t) => t.cardId !== card.id);
    db.appleRegistrations = db.appleRegistrations.filter((r) => r.serial !== serial);
    db.winbacks = db.winbacks.filter((w) => w.cardId !== card.id);
    for (const c of db.campaigns) if (c.cardIds) c.cardIds = c.cardIds.filter((id) => id !== card.id);
    if (!db.cards.some((c) => c.customerId === card.customerId)) {
      db.customers = db.customers.filter((c) => c.id !== card.customerId);
    }
    return true;
  });
}

const csvCell = (v: unknown) => {
  const s = v === undefined || v === null ? "" : String(v);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Export des clients en CSV (séparateur ";" pour Excel en français). */
export async function exportCustomersCsv(staff: Staff) {
  requireOwner(staff);
  const db = await load();
  const p = programOf(db, staff);
  const header = [
    "Prénom",
    "E-mail",
    "Téléphone",
    "Accepte les offres",
    "Anniversaire",
    p.type === "stamps" ? "Tampons" : "Points",
    "Récompenses disponibles",
    "Récompenses utilisées",
    "Passages",
    "Dernier passage",
    "Inscrit le",
  ];
  const lines = rows(db, p).map((r) =>
    [
      r.firstName,
      r.email,
      r.phone,
      r.marketingConsent ? "oui" : "non",
      r.birthday ? `${r.birthday.slice(3)}/${r.birthday.slice(0, 2)}` : "",
      p.type === "stamps" ? r.stamps : r.points,
      r.rewardsAvailable,
      r.rewardsRedeemed,
      r.visits,
      r.lastVisitAt ? parisDay(r.lastVisitAt) : "",
      parisDay(r.createdAt),
    ]
      .map(csvCell)
      .join(";"),
  );
  return "﻿" + [header.join(";"), ...lines].join("\r\n");
}

// ——— Équipe ———

export async function listTeam(staff: Staff) {
  requireOwner(staff);
  const db = await load();
  return db.staff
    .filter((s) => s.merchantId === staff.merchantId)
    .map((s) => ({ id: s.id, name: s.name, email: s.email, role: s.role, me: s.id === staff.id }));
}

export function addTeamMember(staff: Staff, input: { name: string; email: string; pin: string }) {
  requireOwner(staff);
  return mutate((db) => {
    const email = input.email.trim().toLowerCase();
    if (db.staff.some((s) => s.email.toLowerCase() === email)) throw new RuleError("Cet e-mail est déjà utilisé");
    const member: Staff = {
      id: crypto.randomUUID(),
      role: "staff",
      merchantId: staff.merchantId,
      name: input.name,
      email,
      pinHash: hashPin(input.pin),
    };
    db.staff.push(member);
    return { id: member.id, name: member.name, email: member.email, role: member.role, me: false };
  });
}

export function removeTeamMember(staff: Staff, id: string) {
  requireOwner(staff);
  return mutate((db) => {
    const member = db.staff.find((s) => s.id === id && s.merchantId === staff.merchantId);
    if (!member) return false;
    if (member.role === "owner") throw new RuleError("Le compte du responsable ne peut pas être supprimé ici");
    db.staff = db.staff.filter((s) => s.id !== id);
    db.sessions = db.sessions.filter((s) => s.staffId !== id);
    return true;
  });
}

export function changePin(staff: Staff, current: string, next: string) {
  return mutate((db) => {
    const me = db.staff.find((s) => s.id === staff.id);
    if (!me || !verifyPin(current, me.pinHash)) throw new RuleError("Code actuel incorrect");
    me.pinHash = hashPin(next);
    return true;
  });
}

/**
 * Suppression de compte (RGPD, et obligatoire pour l'App Store).
 * - Vendeur : supprime seulement son propre accès.
 * - Responsable : supprime le commerce et toutes ses données (programme, clients, cartes,
 *   passages, messages, vendeurs, sessions). L'abonnement Stripe est résilié avant par l'appelant.
 * Renvoie l'identifiant d'abonnement Stripe à résilier, s'il y en a un.
 */
export function deleteAccount(staff: Staff): Promise<{ scope: "staff" | "merchant"; stripeSubscriptionId?: string }> {
  return mutate((db) => {
    if (staff.role !== "owner") {
      db.staff = db.staff.filter((s) => s.id !== staff.id);
      db.sessions = db.sessions.filter((s) => s.staffId !== staff.id);
      return { scope: "staff" as const };
    }
    const merchantId = staff.merchantId;
    const merchant = db.merchants.find((m) => m.id === merchantId);
    const programIds = new Set(db.programs.filter((p) => p.merchantId === merchantId).map((p) => p.id));
    const cards = db.cards.filter((c) => programIds.has(c.programId));
    const cardIds = new Set(cards.map((c) => c.id));
    const serials = new Set(cards.map((c) => c.serial));
    const staffIds = new Set(db.staff.filter((s) => s.merchantId === merchantId).map((s) => s.id));

    db.transactions = db.transactions.filter((t) => !cardIds.has(t.cardId));
    db.appleRegistrations = db.appleRegistrations.filter((r) => !serials.has(r.serial));
    db.winbacks = db.winbacks.filter((w) => !programIds.has(w.programId));
    db.campaigns = db.campaigns.filter((c) => !programIds.has(c.programId));
    db.cards = db.cards.filter((c) => !cardIds.has(c.id));
    db.customers = db.customers.filter((c) => c.merchantId !== merchantId);
    db.programs = db.programs.filter((p) => p.merchantId !== merchantId);
    db.sessions = db.sessions.filter((s) => !staffIds.has(s.staffId));
    db.staff = db.staff.filter((s) => s.merchantId !== merchantId);
    db.merchants = db.merchants.filter((m) => m.id !== merchantId);
    return { scope: "merchant" as const, stripeSubscriptionId: merchant?.subscription.stripeSubscriptionId };
  });
}

/** Déconnexion : le jeton de session est supprimé côté serveur. */
export function revokeSession(token: string) {
  return mutate((db) => {
    db.sessions = db.sessions.filter((s) => s.token !== token);
  });
}
