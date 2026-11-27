// Où vivent les protections (limite d'essais, blocage après codes faux, liens d'export) :
// - base Postgres (DATABASE_URL défini) → partagées entre tous les serveurs, gardées après un redémarrage ;
// - sinon → mémoire du serveur (développement avec le fichier JSON).
// Si les migrations 0002/0003 n'ont pas encore été appliquées, on se rabat sur la mémoire
// (avec un avertissement dans les journaux) plutôt que de bloquer les connexions, et on réessaie chaque minute.
import "server-only";
import type { PoolClient } from "pg";
import { usingPostgres } from "./db";
import { pgTransaction } from "./db-postgres";

// Tables absentes : on réessaie la base au plus tard une minute après (migration appliquée entre-temps)
const RETRY_MS = 60_000;
let missingSince = 0;

/** Exécute `pg` sur la base si possible, sinon `memory`. */
export async function withSecurityStore<T>(pg: (client: PoolClient) => Promise<T>, memory: () => T): Promise<T> {
  if (!usingPostgres() || (missingSince && Date.now() - missingSince < RETRY_MS)) return memory();
  try {
    const result = await pgTransaction(pg);
    missingSince = 0;
    return result;
  } catch (e) {
    // 42P01 : table absente ; 42703 : colonne absente (migration 0003 pas encore appliquée)
    if (["42P01", "42703"].includes((e as { code?: string }).code ?? "")) {
      if (!missingSince) console.warn("[sécurité] Tables absentes : appliquez les migrations de supabase/migrations (npx supabase db push --remote) (protections gardées en mémoire en attendant)");
      missingSince = Date.now();
      return memory();
    }
    throw e;
  }
}
