// Où vivent les protections (limite d'essais, blocage après codes faux, liens d'export) :
// - base Postgres (DATABASE_URL défini) → partagées entre tous les serveurs, gardées après un redémarrage ;
// - sinon → mémoire du serveur (développement avec le fichier JSON).
// Si la migration 0002_securite.sql n'a pas encore été appliquée, on se rabat sur la mémoire
// (avec un avertissement dans les journaux) plutôt que de bloquer les connexions.
import "server-only";
import type { PoolClient } from "pg";
import { usingPostgres } from "./db";
import { pgTransaction } from "./db-postgres";

let missingTables = false;

/** Exécute `pg` sur la base si possible, sinon `memory`. */
export async function withSecurityStore<T>(pg: (client: PoolClient) => Promise<T>, memory: () => T): Promise<T> {
  if (!usingPostgres() || missingTables) return memory();
  try {
    return await pgTransaction(pg);
  } catch (e) {
    if ((e as { code?: string }).code === "42P01") {
      missingTables = true;
      console.warn("[sécurité] Tables absentes : appliquez supabase/migrations/0002_securite.sql (protections gardées en mémoire en attendant)");
      return memory();
    }
    throw e;
  }
}
