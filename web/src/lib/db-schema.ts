// Correspondance entre les objets du code (types.ts) et les tables Postgres (supabase/migrations).
// Module sans dépendance au serveur Next.js : le serveur (db-postgres.ts) et le script de tests
// de bout en bout (scripts/e2e-api.mjs) s'en servent tous les deux.
import { types, type Pool, type PoolClient } from "pg";
import type { DevDb } from "./db";

// timestamptz → chaîne ISO (« 2026-11-22T10:00:00.000Z »), comme dans le reste du code
types.setTypeParser(1184, (v) => new Date(v).toISOString());
// int8 (count) → nombre
types.setTypeParser(20, (v) => Number(v));

type Row = Record<string, unknown>;
type Kind = "text" | "num" | "bool" | "time" | "json" | "array";

interface Column {
  /** Chemin dans l'objet TypeScript ("subscription.status" pour un champ imbriqué). */
  path: string;
  column: string;
  kind: Kind;
  /** Valeur écrite quand le champ est absent (colonne NOT NULL avec une valeur par défaut). */
  fallback?: unknown;
}

interface Table {
  key: keyof DevDb;
  name: string;
  /** Champs de la clé primaire (chemins TypeScript). */
  pk: string[];
  columns: Column[];
}

const c = (path: string, column: string, kind: Kind = "text", fallback?: unknown): Column => ({ path, column, kind, fallback });

/** Correspondance types.ts ↔ supabase/migrations/0001_init.sql. Ordre = ordre d'insertion (clés étrangères). */
export const TABLES: Table[] = [
  {
    key: "merchants",
    name: "merchants",
    pk: ["id"],
    columns: [
      c("id", "id"),
      c("name", "name"),
      c("createdAt", "created_at", "time"),
      c("demo", "demo", "bool", false),
      c("demoRefreshedAt", "demo_refreshed_at", "time"),
      c("subscription.status", "sub_status"),
      c("subscription.plan", "sub_plan"),
      c("subscription.trialEnd", "sub_trial_end", "time"),
      c("subscription.currentPeriodEnd", "sub_current_period_end", "time"),
      c("subscription.stripeCustomerId", "stripe_customer_id"),
      c("subscription.stripeSubscriptionId", "stripe_subscription_id"),
      c("subscription.updatedAt", "sub_updated_at", "time"),
    ],
  },
  {
    key: "programs",
    name: "programs",
    pk: ["id"],
    columns: [
      c("id", "id"),
      c("merchantId", "merchant_id"),
      c("slug", "slug"),
      c("type", "type"),
      c("name", "name"),
      c("merchantName", "merchant_name"),
      c("rewardLabel", "reward_label"),
      c("stampsRequired", "stamps_required", "num"),
      c("pointsRequired", "points_required", "num"),
      c("pointsPerEuro", "points_per_euro", "num"),
      c("welcomeBonus", "welcome_bonus", "num"),
      c("bgColor", "bg_color"),
      c("fgColor", "fg_color"),
      c("accentColor", "accent_color"),
      c("labelColor", "label_color"),
      c("logoUrl", "logo_url"),
      c("logo", "logo"),
      c("banner", "banner"),
      c("stampIcon", "stamp_icon"),
      c("template", "template"),
      c("pattern", "pattern", "bool"),
      c("terms", "terms"),
      c("locations", "locations", "json"),
      c("averageBasket", "average_basket", "num"),
      c("customizedAt", "customized_at", "time"),
      c("winback", "winback", "json"),
      c("review", "review", "json"),
      c("birthday", "birthday", "json"),
    ],
  },
  {
    key: "customers",
    name: "customers",
    pk: ["id"],
    columns: [
      c("id", "id"),
      c("merchantId", "merchant_id"),
      c("firstName", "first_name"),
      c("email", "email"),
      c("phone", "phone"),
      c("marketingConsent", "marketing_consent", "bool"),
      c("marketingConsentAt", "marketing_consent_at", "time"),
      c("birthday", "birthday"),
      c("createdAt", "created_at", "time"),
    ],
  },
  {
    key: "cards",
    name: "cards",
    pk: ["id"],
    columns: [
      c("id", "id"),
      c("programId", "program_id"),
      c("customerId", "customer_id"),
      c("serial", "serial"),
      c("authToken", "auth_token"),
      c("stamps", "stamps", "num"),
      c("points", "points", "num"),
      c("rewardsAvailable", "rewards_available", "num"),
      c("rewardsRedeemed", "rewards_redeemed", "num"),
      c("lastMessage", "last_message"),
      c("reviewAskedAt", "review_asked_at", "time"),
      c("birthdayYear", "birthday_year", "num"),
      c("googleObjectId", "google_object_id"),
      c("createdAt", "created_at", "time"),
      c("updatedAt", "updated_at", "time"),
    ],
  },
  {
    key: "staff",
    name: "staff",
    pk: ["id"],
    columns: [c("id", "id"), c("merchantId", "merchant_id"), c("role", "role"), c("name", "name"), c("email", "email"), c("pinHash", "pin_hash")],
  },
  {
    key: "sessions",
    name: "sessions",
    pk: ["token"],
    columns: [c("token", "token"), c("staffId", "staff_id"), c("createdAt", "created_at", "time")],
  },
  {
    key: "transactions",
    name: "transactions",
    pk: ["id"],
    columns: [
      c("id", "id"),
      c("cardId", "card_id"),
      c("staffId", "staff_id"),
      c("kind", "kind"),
      c("amount", "amount", "num"),
      c("clientOpId", "client_op_id"),
      c("occurredAt", "occurred_at", "time"),
      c("createdAt", "created_at", "time"),
    ],
  },
  {
    key: "campaigns",
    name: "campaigns",
    pk: ["id"],
    columns: [
      c("id", "id"),
      c("programId", "program_id"),
      c("message", "message"),
      c("createdBy", "created_by"),
      c("createdAt", "created_at", "time"),
      c("sentAt", "sent_at", "time"),
      c("recipients", "recipients", "num"),
      c("cardIds", "card_ids", "array"),
    ],
  },
  {
    key: "appleRegistrations",
    name: "apple_registrations",
    pk: ["deviceLibraryId", "serial"],
    columns: [c("deviceLibraryId", "device_library_id"), c("pushToken", "push_token"), c("serial", "serial"), c("createdAt", "created_at", "time")],
  },
  {
    key: "winbacks",
    name: "winbacks",
    pk: ["id"],
    columns: [c("id", "id"), c("programId", "program_id"), c("cardId", "card_id"), c("sentAt", "sent_at", "time")],
  },
];

// ——— Conversion objet ↔ ligne ———

function get(obj: Row, path: string): unknown {
  return path.split(".").reduce<unknown>((o, k) => (o == null ? undefined : (o as Row)[k]), obj);
}

function set(obj: Row, path: string, value: unknown) {
  const keys = path.split(".");
  let o = obj;
  for (const k of keys.slice(0, -1)) o = (o[k] ??= {}) as Row;
  o[keys[keys.length - 1]] = value;
}

/** Ligne SQL → objet du code. Les NULL deviennent des champs absents (comme dans le fichier JSON). */
function fromRow(t: Table, row: Row): Row {
  const out: Row = {};
  for (const col of t.columns) {
    const v = row[col.column];
    if (v === null || v === undefined || (col.fallback !== undefined && v === col.fallback)) continue;
    set(out, col.path, col.kind === "num" ? Number(v) : v);
  }
  return out;
}

/** Valeurs SQL d'un objet du code, dans l'ordre des colonnes. */
function toValues(t: Table, obj: Row): unknown[] {
  return t.columns.map((col) => {
    const v = get(obj, col.path) ?? col.fallback;
    if (v === undefined || v === null) return null;
    if (col.kind === "json") return JSON.stringify(v);
    if (col.kind === "time") {
      const d = new Date(v as string);
      if (Number.isNaN(d.getTime())) throw new Error(`Date invalide pour ${t.name}.${col.column} : ${String(v)}`);
      return d.toISOString();
    }
    return v;
  });
}

const pkOf = (t: Table, obj: Row) => JSON.stringify(t.pk.map((p) => get(obj, p)));
/** Empreinte d'une ligne telle qu'elle serait écrite : sert à ne renvoyer que ce qui a changé. */
const fingerprint = (t: Table, obj: Row) => JSON.stringify(toValues(t, obj));

export async function readAll(client: Pool | PoolClient): Promise<DevDb> {
  const db = {} as Record<keyof DevDb, Row[]>;
  for (const t of TABLES) {
    const cols = t.columns.map((col) => col.column).join(", ");
    // Ordre stable (date de création puis clé), proche de l'ordre d'ajout du fichier JSON
    const keys = t.pk.map(pkColumn(t)).join(", ");
    const order = t.columns.some((col) => col.column === "created_at") ? ` order by created_at, ${keys}` : ` order by ${keys}`;
    const { rows } = await client.query(`select ${cols} from ${t.name}${order}`);
    db[t.key] = rows.map((r) => fromRow(t, r));
  }
  return db as unknown as DevDb;
}

const pkColumn = (t: Table) => (path: string) => t.columns.find((col) => col.path === path)!.column;

/** Écrit la différence entre l'état lu (before) et l'état modifié (after), table par table. */
export async function writeDiff(client: PoolClient, before: DevDb, after: DevDb) {
  // Suppressions d'abord, des tables « enfants » vers les tables « parents »
  for (const t of [...TABLES].reverse()) {
    const next = new Set((after[t.key] as unknown as Row[]).map((o) => pkOf(t, o)));
    for (const old of before[t.key] as unknown as Row[]) {
      if (next.has(pkOf(t, old))) continue;
      const where = t.pk.map((p, i) => `${pkColumn(t)(p)} = $${i + 1}`).join(" and ");
      await client.query(`delete from ${t.name} where ${where}`, t.pk.map((p) => get(old, p)));
    }
  }
  // Ajouts et modifications, des parents vers les enfants
  for (const t of TABLES) {
    const prev = new Map((before[t.key] as unknown as Row[]).map((o) => [pkOf(t, o), fingerprint(t, o)]));
    const cols = t.columns.map((col) => col.column);
    const pkCols = t.pk.map(pkColumn(t));
    const updates = cols.filter((col) => !pkCols.includes(col)).map((col) => `${col} = excluded.${col}`);
    const sql = `insert into ${t.name} (${cols.join(", ")}) values (${cols.map((_, i) => `$${i + 1}`).join(", ")})
      on conflict (${pkCols.join(", ")}) do ${updates.length ? `update set ${updates.join(", ")}` : "nothing"}`;
    for (const obj of after[t.key] as unknown as Row[]) {
      const was = prev.get(pkOf(t, obj));
      if (was !== undefined && was === fingerprint(t, obj)) continue;
      await client.query(sql, toValues(t, obj));
    }
  }
}
