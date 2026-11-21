// Mode démo de l'appli (« Découvrir l'appli ») : une boulangerie fictive en lecture seule.
// Les visiteurs voient une vraie appli avec des clients et des chiffres plausibles,
// mais toute modification est refusée par le serveur (voir withStaff).
import "server-only";
import crypto from "crypto";
import { mutate, type DevDb } from "./db";
import { subscriptionView } from "./subscription";
import type { Card, Customer, Transaction } from "./types";

export const DEMO_MERCHANT = "merchant-vitrine";
const DEMO_PROGRAM = "prog-vitrine";
export const DEMO_STAFF = "staff-vitrine";
/** Les données sont régénérées quand elles ont plus de 2 jours, pour que les graphiques restent « d'actualité ». */
const REFRESH_MS = 2 * 86400_000;
const SESSION_MS = 24 * 3600_000;

const FIRST_NAMES = [
  "Camille", "Léa", "Hugo", "Manon", "Lucas", "Chloé", "Nathan", "Inès", "Louis", "Sarah", "Jules", "Emma", "Adam", "Jade",
  "Gabriel", "Louise", "Raphaël", "Alice", "Arthur", "Lina", "Paul", "Rose", "Yanis", "Anna", "Théo", "Zoé", "Noah", "Mila",
  "Ethan", "Nina", "Sacha", "Lou", "Malik", "Eva", "Tom", "Iris", "Samir", "Julia",
];

/** Petit générateur pseudo-aléatoire déterministe : la démo a toujours la même allure. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const rid = () => crypto.randomBytes(12).toString("base64url");

function ensureBase(db: DevDb, now: string) {
  if (!db.merchants.some((m) => m.id === DEMO_MERCHANT)) {
    db.merchants.push({ id: DEMO_MERCHANT, name: "Boulangerie Démo", demo: true, createdAt: now, subscription: { status: "active", updatedAt: now } });
  }
  if (!db.programs.some((p) => p.id === DEMO_PROGRAM)) {
    db.programs.push({
      id: DEMO_PROGRAM,
      merchantId: DEMO_MERCHANT,
      slug: "boulangerie-demo",
      type: "stamps",
      name: "Carte du fournil",
      merchantName: "Boulangerie Démo",
      rewardLabel: "1 baguette offerte",
      stampsRequired: 10,
      pointsRequired: 100,
      pointsPerEuro: 1,
      welcomeBonus: 1,
      bgColor: "#3b2416",
      fgColor: "#fdf6ec",
      accentColor: "#e0a458",
      stampIcon: "baguette",
      template: "boulangerie",
      pattern: true,
      terms: "Un tampon par passage en caisse. Récompense valable 6 mois.",
      averageBasket: 6.5,
      customizedAt: now,
    });
  }
  const program = db.programs.find((p) => p.id === DEMO_PROGRAM)!;
  program.locations ??= [{ latitude: 48.8642, longitude: 2.3601, relevantText: "Votre baguette offerte vous attend juste à côté" }];
  if (!db.staff.some((s) => s.id === DEMO_STAFF)) {
    // Pas de code PIN utilisable : on n'entre dans ce compte que par le bouton « Découvrir l'appli »
    db.staff.push({ id: DEMO_STAFF, role: "owner", merchantId: DEMO_MERCHANT, name: "Marie", email: "demo@vitrine.invalid", pinHash: "x:00" });
  }
}

/** Recrée clients, cartes et passages des 45 derniers jours. */
function rebuildActivity(db: DevDb, nowMs: number) {
  const oldCards = new Set(db.cards.filter((c) => c.programId === DEMO_PROGRAM).map((c) => c.id));
  db.transactions = db.transactions.filter((t) => !oldCards.has(t.cardId));
  db.cards = db.cards.filter((c) => c.programId !== DEMO_PROGRAM);
  db.customers = db.customers.filter((c) => c.merchantId !== DEMO_MERCHANT);
  db.campaigns = db.campaigns.filter((c) => c.programId !== DEMO_PROGRAM);

  const rand = rng(42);
  const day = 86400_000;
  FIRST_NAMES.forEach((firstName, i) => {
    const joinedDaysAgo = Math.floor(rand() * 60) + 1;
    const created = new Date(nowMs - joinedDaysAgo * day).toISOString();
    const customer: Customer = { id: rid(), merchantId: DEMO_MERCHANT, firstName, marketingConsent: rand() > 0.3, createdAt: created };
    const card: Card = {
      id: rid(),
      programId: DEMO_PROGRAM,
      customerId: customer.id,
      serial: `demo-${i.toString().padStart(2, "0")}-${rid().slice(0, 6)}`,
      authToken: rid(),
      stamps: 0,
      points: 0,
      rewardsAvailable: 0,
      rewardsRedeemed: 0,
      createdAt: created,
      updatedAt: created,
    };
    // Habitués (visites fréquentes) et clients occasionnels
    const regular = rand() < 0.4;
    const visits = regular ? 6 + Math.floor(rand() * 14) : 1 + Math.floor(rand() * 5);
    const window = Math.min(joinedDaysAgo, 45);
    const times = Array.from({ length: visits }, () => nowMs - Math.floor(rand() * window * day) - Math.floor(rand() * 8 * 3600_000))
      .filter((t) => t >= Date.parse(created))
      .sort((a, b) => a - b);
    for (const t of times) {
      const at = new Date(t).toISOString();
      const tx: Transaction = { id: rid(), cardId: card.id, staffId: DEMO_STAFF, kind: "stamp", amount: 1, clientOpId: rid(), occurredAt: at, createdAt: at };
      db.transactions.push(tx);
      card.stamps += 1;
      if (card.stamps >= 10) {
        card.stamps -= 10;
        card.rewardsAvailable += 1;
      }
      card.updatedAt = at;
      // La plupart des récompenses gagnées sont utilisées quelques jours plus tard
      const usedAt = t + day * (1 + rand() * 3);
      if (card.rewardsAvailable && rand() < 0.7 && usedAt < nowMs) {
        const used = new Date(usedAt).toISOString();
        db.transactions.push({ id: rid(), cardId: card.id, staffId: DEMO_STAFF, kind: "reward", amount: 1, clientOpId: rid(), occurredAt: used, createdAt: used });
        card.rewardsAvailable -= 1;
        card.rewardsRedeemed += 1;
      }
    }
    db.customers.push(customer);
    db.cards.push(card);
  });
  db.campaigns.push({
    id: rid(),
    programId: DEMO_PROGRAM,
    message: "Cette semaine : la galette des rois est arrivée !",
    createdBy: DEMO_STAFF,
    createdAt: new Date(nowMs - 6 * day).toISOString(),
    sentAt: new Date(nowMs - 6 * day).toISOString(),
    recipients: 26,
  });
}

/** Ouvre une session sur la boutique de démo (données régénérées si besoin). */
export function startDemoSession() {
  return mutate((db) => {
    const nowMs = Date.now();
    const now = new Date(nowMs).toISOString();
    ensureBase(db, now);
    const merchant = db.merchants.find((m) => m.id === DEMO_MERCHANT)!;
    const fresh = merchant.demoRefreshedAt && nowMs - Date.parse(merchant.demoRefreshedAt) < REFRESH_MS;
    if (!fresh) {
      rebuildActivity(db, nowMs);
      merchant.demoRefreshedAt = now;
    }
    // Les sessions de démo ne durent qu'une journée
    db.sessions = db.sessions.filter((s) => s.staffId !== DEMO_STAFF || nowMs - Date.parse(s.createdAt) < SESSION_MS);
    const token = crypto.randomBytes(32).toString("base64url");
    db.sessions.push({ token, staffId: DEMO_STAFF, createdAt: now });
    const staff = db.staff.find((s) => s.id === DEMO_STAFF)!;
    return {
      token,
      staff: { id: staff.id, name: staff.name, merchantId: staff.merchantId, role: staff.role },
      subscription: subscriptionView(merchant),
      demo: true,
    };
  });
}
