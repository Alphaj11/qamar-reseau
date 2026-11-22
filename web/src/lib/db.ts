// Accès aux données. Toutes les pages passent par load() et mutate().
// - DATABASE_URL défini → Postgres (Supabase en local ou en ligne), voir db-postgres.ts.
// - Sinon → fichier JSON local (web/.data/dev-db.json), pratique pour bricoler sans base.
import "server-only";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { postgresStore } from "./db-postgres";
import type { AppleRegistration, Campaign, Winback, Card, Customer, Merchant, Program, Staff, StaffSession, Transaction } from "./types";

export interface DevDb {
  merchants: Merchant[];
  programs: Program[];
  customers: Customer[];
  cards: Card[];
  staff: Staff[];
  sessions: StaffSession[];
  transactions: Transaction[];
  campaigns: Campaign[];
  appleRegistrations: AppleRegistration[];
  winbacks: Winback[];
}

/** Hash d'un code PIN (scrypt + sel). Format : "sel:hash". */
export function hashPin(pin: string, salt = crypto.randomBytes(16).toString("hex")) {
  return `${salt}:${crypto.scryptSync(pin, salt, 32).toString("hex")}`;
}

export function verifyPin(pin: string, stored: string) {
  const [salt, hash] = stored.split(":");
  const candidate = Buffer.from(hashPin(pin, salt).split(":")[1], "hex");
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}

const DB_FILE = path.join(process.cwd(), ".data", "dev-db.json");

const SEED_TIME = "2026-11-15T00:00:00.000Z";

const SEED: DevDb = {
  // Commerces de démo, abonnement actif
  merchants: [
    { id: "merchant-demo", name: "Café Démo", createdAt: SEED_TIME, subscription: { status: "active", updatedAt: SEED_TIME } },
    { id: "merchant-demo-2", name: "Institut Démo", createdAt: SEED_TIME, subscription: { status: "active", updatedAt: SEED_TIME } },
  ],
  programs: [
    {
      id: "prog-cafe",
      merchantId: "merchant-demo",
      slug: "cafe-demo",
      type: "stamps",
      name: "Carte de fidélité",
      merchantName: "Café Démo",
      rewardLabel: "1 café offert",
      stampsRequired: 10,
      pointsRequired: 100,
      pointsPerEuro: 1,
      welcomeBonus: 1,
      bgColor: "#3b2416",
      fgColor: "#fdf6ec",
      accentColor: "#e0a458",
      stampIcon: "coffee",
      terms: "Un tampon par achat. Récompense valable 6 mois.",
      locations: [{ latitude: 48.8566, longitude: 2.3522, relevantText: "Votre café vous attend juste à côté" }],
    },
    {
      id: "prog-beaute",
      merchantId: "merchant-demo-2",
      slug: "institut-demo",
      type: "points",
      name: "Club beauté",
      merchantName: "Institut Démo",
      rewardLabel: "10 € de réduction",
      stampsRequired: 10,
      pointsRequired: 200,
      pointsPerEuro: 1,
      welcomeBonus: 20,
      bgColor: "#f3e8e4",
      fgColor: "#4a2c2a",
      accentColor: "#b5536b",
      stampIcon: "heart",
      terms: "1 point par euro dépensé.",
    },
  ],
  customers: [],
  cards: [],
  // Comptes vendeurs de démo (identifiants de test, à remplacer par Supabase Auth)
  staff: [
    { id: "staff-cafe", role: "owner", merchantId: "merchant-demo", name: "Patron café", email: "cafe@demo.test", pinHash: hashPin("1234") },
    { id: "staff-cafe-vendeur", role: "staff", merchantId: "merchant-demo", name: "Vendeur café", email: "vendeur@demo.test", pinHash: hashPin("1234") },
    { id: "staff-beaute", role: "owner", merchantId: "merchant-demo-2", name: "Patronne institut", email: "institut@demo.test", pinHash: hashPin("1234") },
  ],
  sessions: [],
  transactions: [],
  campaigns: [],
  appleRegistrations: [],
  winbacks: [],
};

let writeQueue: Promise<unknown> = Promise.resolve();

/** Base Postgres si DATABASE_URL est configuré, sinon fichier JSON. */
export const usingPostgres = () => !!process.env.DATABASE_URL;
let pg: ReturnType<typeof postgresStore> | undefined;
const postgres = () => (pg ??= postgresStore(SEED));

export async function load(): Promise<DevDb> {
  if (usingPostgres()) return postgres().load();
  return loadJson();
}

/** La base répond-elle ? (pour /api/health, sans tout relire). */
export async function ping() {
  if (usingPostgres()) return postgres().ping();
  await loadJson();
}

async function loadJson(): Promise<DevDb> {
  try {
    const db = JSON.parse(await fs.readFile(DB_FILE, "utf8")) as DevDb;
    // Fichiers créés avant le sprint 3 : on ajoute les nouvelles tables
    db.staff ??= structuredClone(SEED.staff);
    db.sessions ??= [];
    db.transactions ??= [];
    // Sprint 4 : nouvelles tables et rôles
    db.campaigns ??= [];
    db.appleRegistrations ??= [];
    db.winbacks ??= [];
    // Abonnements : les commerces existants avant cette version sont ceux de démo
    db.merchants ??= [];
    for (const m of SEED.merchants) if (!db.merchants.some((x) => x.id === m.id)) db.merchants.push(structuredClone(m));
    for (const s of SEED.staff) if (!db.staff.some((x) => x.id === s.id)) db.staff.push(structuredClone(s));
    for (const s of db.staff) s.role ??= SEED.staff.find((x) => x.id === s.id)?.role ?? "staff";
    for (const p of db.programs) p.locations ??= SEED.programs.find((x) => x.id === p.id)?.locations;
    return db;
  } catch {
    await save(SEED);
    return structuredClone(SEED);
  }
}

async function save(db: DevDb) {
  await fs.mkdir(path.dirname(DB_FILE), { recursive: true });
  await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), "utf8");
}

/** Sérialise les écritures pour éviter qu'elles s'écrasent entre elles. */
export function mutate<T>(fn: (db: DevDb) => T): Promise<T> {
  if (usingPostgres()) return postgres().mutate(fn);
  const run = writeQueue.then(async () => {
    const db = await loadJson();
    const result = fn(db);
    await save(db);
    return result;
  });
  writeQueue = run.catch(() => undefined);
  return run;
}

export async function getMerchant(id: string): Promise<Merchant | undefined> {
  return (await load()).merchants.find((m) => m.id === id);
}

export async function listPrograms(): Promise<Program[]> {
  return (await load()).programs;
}

export async function getProgramBySlug(slug: string): Promise<Program | undefined> {
  return (await load()).programs.find((p) => p.slug === slug);
}

export async function getCardWithProgram(
  cardId: string,
): Promise<{ card: Card; program: Program; customer: Customer } | undefined> {
  const db = await load();
  const card = db.cards.find((c) => c.id === cardId);
  if (!card) return undefined;
  const program = db.programs.find((p) => p.id === card.programId);
  const customer = db.customers.find((c) => c.id === card.customerId);
  if (!program || !customer) return undefined;
  return { card, program, customer };
}

export interface EnrollInput {
  programId: string;
  firstName: string;
  email?: string;
  phone?: string;
  marketingConsent: boolean;
  /** "MM-JJ", facultatif. */
  birthday?: string;
}

/** Inscrit un client. S'il est déjà inscrit (même e-mail ou téléphone), renvoie sa carte existante. */
export function enroll(input: EnrollInput): Promise<Card> {
  return mutate((db) => {
    const program = db.programs.find((p) => p.id === input.programId);
    if (!program) throw new Error("Programme introuvable");

    const now = new Date().toISOString();
    let customer = db.customers.find(
      (c) =>
        c.merchantId === program.merchantId &&
        ((input.email && c.email === input.email) || (input.phone && c.phone === input.phone)),
    );
    if (!customer) {
      customer = {
        id: crypto.randomUUID(),
        merchantId: program.merchantId,
        firstName: input.firstName,
        email: input.email,
        phone: input.phone,
        marketingConsent: input.marketingConsent,
        marketingConsentAt: input.marketingConsent ? now : undefined,
        birthday: input.birthday,
        createdAt: now,
      };
      db.customers.push(customer);
    } else if (input.birthday && !customer.birthday) {
      customer.birthday = input.birthday;
    }

    const existing = db.cards.find(
      (c) => c.programId === program.id && c.customerId === customer.id,
    );
    if (existing) return existing;

    const card: Card = {
      id: crypto.randomUUID(),
      programId: program.id,
      customerId: customer.id,
      // Numéro court lisible, encodé dans le QR de la carte
      serial: crypto.randomBytes(9).toString("base64url"),
      authToken: crypto.randomBytes(24).toString("hex"),
      stamps: program.type === "stamps" ? Math.min(program.welcomeBonus, program.stampsRequired) : 0,
      points: program.type === "points" ? program.welcomeBonus : 0,
      rewardsAvailable: 0,
      rewardsRedeemed: 0,
      createdAt: now,
      updatedAt: now,
    };
    db.cards.push(card);
    return card;
  });
}

