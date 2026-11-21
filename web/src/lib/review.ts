// Demande d'avis Google : après la N-ième visite, un message invite le client à laisser un avis,
// et le lien reste au dos de sa carte. Un client n'est sollicité qu'une seule fois.
// On ne peut pas savoir si l'avis a été publié : Google ne le dit pas.
import "server-only";
import { load, mutate, type DevDb } from "./db";
import { requireOwner } from "./merchant";
import type { Card, Program, ReviewSettings, Staff } from "./types";

export const DEFAULT_REVIEW: ReviewSettings = {
  enabled: false,
  url: "",
  afterVisits: 3,
  message: "Merci pour votre fidélité ! Un petit avis Google nous aiderait beaucoup, le lien est au dos de votre carte.",
};

/** Adresses acceptées : les liens d'avis fournis par Google (fiche d'établissement, Maps, liens courts). */
const GOOGLE_HOSTS = ["g.page", "search.google.com", "google.com", "www.google.com", "maps.google.com", "maps.app.goo.gl", "goo.gl", "g.co"];

export function isGoogleReviewUrl(value: string) {
  try {
    const u = new URL(value);
    return u.protocol === "https:" && GOOGLE_HOSTS.includes(u.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export const reviewOf = (p: Program): ReviewSettings => ({ ...DEFAULT_REVIEW, ...p.review });

/** Lien à afficher au dos de la carte, seulement si la demande est active. */
export function reviewUrlFor(p: Program) {
  const r = reviewOf(p);
  return r.enabled && r.url ? r.url : undefined;
}

function visitsOf(db: DevDb, card: Card) {
  return db.transactions.filter((t) => t.cardId === card.id && t.kind !== "reward").length;
}

/**
 * Appelé après un passage en caisse : si le client vient d'atteindre le nombre de visites prévu
 * et n'a jamais été sollicité, prépare le message. Renvoie le texte envoyé, ou undefined.
 */
export function maybeAskReview(db: DevDb, card: Card, program: Program, now: string) {
  const r = reviewOf(program);
  if (!r.enabled || !r.url || card.reviewAskedAt) return undefined;
  const customer = db.customers.find((c) => c.id === card.customerId);
  // Message sur la carte = communication commerciale : seulement avec l'accord du client
  if (!customer?.marketingConsent) return undefined;
  if (visitsOf(db, card) < r.afterVisits) return undefined;
  card.reviewAskedAt = now;
  card.lastMessage = r.message;
  return r.message;
}

export async function reviewOverview(staff: Staff, now = Date.now()) {
  requireOwner(staff);
  const db = await load();
  const program = db.programs.find((p) => p.merchantId === staff.merchantId);
  if (!program) throw new Error("Aucun programme");
  const cards = db.cards.filter((c) => c.programId === program.id);
  const since = new Date(now - 30 * 86400_000).toISOString();
  return {
    settings: reviewOf(program),
    asked: cards.filter((c) => c.reviewAskedAt).length,
    askedLast30Days: cards.filter((c) => c.reviewAskedAt && c.reviewAskedAt >= since).length,
  };
}

/** Modifie la demande d'avis. Si le lien affiché au dos change, renvoie les cartes à mettre à jour. */
export function updateReview(staff: Staff, patch: Partial<ReviewSettings>) {
  requireOwner(staff);
  return mutate((db) => {
    const program = db.programs.find((p) => p.merchantId === staff.merchantId);
    if (!program) throw new Error("Aucun programme");
    const before = reviewUrlFor(program);
    program.review = { ...reviewOf(program), ...patch };
    if (reviewUrlFor(program) === before) return [] as string[];
    const now = new Date().toISOString();
    const cards = db.cards.filter((c) => c.programId === program.id);
    for (const c of cards) c.updatedAt = now;
    return cards.map((c) => c.serial);
  });
}
