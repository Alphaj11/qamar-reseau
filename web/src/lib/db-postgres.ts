// Stockage Postgres (Supabase en local ou en ligne), choisi quand DATABASE_URL est défini.
//
// Le reste du code ne change pas : il lit tout avec load() et écrit avec mutate(fn).
// Ici, mutate ouvre une transaction, verrouille les écritures (un seul écrivain à la fois, même
// avec plusieurs serveurs), applique fn sur les données, puis n'envoie à la base que les lignes
// ajoutées, modifiées ou supprimées. Les contraintes du schéma (types, clés, valeurs permises)
// s'appliquent donc à chaque écriture : une erreur annule toute la transaction.
//
// Limite connue : load() relit toutes les tables. C'est voulu pour cette étape (même comportement
// qu'avec le fichier JSON, donc les tests de bout en bout restent valables) ; les requêtes les plus
// fréquentes seront remplacées par des requêtes ciblées quand le volume le demandera.
import "server-only";
import { Pool, type PoolClient } from "pg";
import type { DevDb } from "./db";
import { readAll, TABLES, writeDiff } from "./db-schema";

// ——— Connexion ———

let pool: Pool | undefined;
function getPool() {
  pool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    max: Number(process.env.DATABASE_POOL_MAX ?? 5),
    // Supabase en ligne exige TLS ; en local (127.0.0.1) on s'en passe
    ssl: /sslmode=require|supabase\.(co|com)/.test(process.env.DATABASE_URL ?? "") ? { rejectUnauthorized: false } : undefined,
  });
  return pool;
}

/**
 * Petite transaction pour les tables de sécurité (rate_hits, login_failures, download_tokens),
 * qui ne passent pas par load()/mutate() : elles sont lues et écrites ligne par ligne.
 */
export async function pgTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("begin");
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (e) {
    await client.query("rollback").catch(() => undefined);
    throw e;
  } finally {
    client.release();
  }
}

/** Remplit une base vide avec les données de démo (comptes cafe@demo.test, etc.). */
async function seedIfEmpty(seed: DevDb) {
  const client = await getPool().connect();
  try {
    await client.query("begin");
    await client.query("select pg_advisory_xact_lock(7243001)");
    const { rows } = await client.query("select count(*)::int as n from merchants");
    if (rows[0].n === 0) {
      const empty = Object.fromEntries(TABLES.map((t) => [t.key, []])) as unknown as DevDb;
      await writeDiff(client, empty, seed);
    }
    await client.query("commit");
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }
}

let seeded: Promise<void> | undefined;

export function postgresStore(seed: DevDb | undefined) {
  const ready = () => (seeded ??= (seed ? seedIfEmpty(seed) : Promise.resolve()).catch((e) => {
    seeded = undefined; // on retentera au prochain appel (base pas encore démarrée…)
    throw e;
  }));

  return {
    /** Vérifie que la base répond (sonde de disponibilité). */
    async ping() {
      await ready();
      await getPool().query("select 1");
    },
    async load(): Promise<DevDb> {
      await ready();
      return readAll(getPool());
    },
    async mutate<T>(fn: (db: DevDb) => T): Promise<T> {
      await ready();
      const client = await getPool().connect();
      try {
        await client.query("begin");
        // Un seul écrivain à la fois : même garantie que la file d'attente du fichier JSON
        await client.query("select pg_advisory_xact_lock(7243002)");
        const before = await readAll(client);
        const db = structuredClone(before);
        const result = fn(db);
        await writeDiff(client, before, db);
        await client.query("commit");
        return result;
      } catch (e) {
        await client.query("rollback").catch(() => undefined);
        throw e;
      } finally {
        client.release();
      }
    },
  };
}
