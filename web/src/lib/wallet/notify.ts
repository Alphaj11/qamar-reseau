// Point d'entrée unique : "ces cartes ont changé, préviens les téléphones".
// Appelé après un passage en caisse, un changement de réglages ou l'envoi d'un message.
// Ne bloque jamais l'appelant : les erreurs sont journalisées, pas propagées.
import "server-only";
import { pushPassUpdates } from "./apns";
import { appleConfig, googleConfig } from "./config";
import { sendGoogleMessage, updateGoogleClass, updateGoogleObject } from "./google";
import type { Program } from "../types";
import { cardsBySerials, pushTokensFor, removePushTokens } from "./registry";

export interface NotifyOptions {
  /** Message de la boutique : notification Google (Apple utilise le changeMessage du champ "message"). */
  message?: { header: string; body: string };
}

export async function notifyCardsChanged(serials: string[], opts: NotifyOptions = {}) {
  if (!serials.length) return;
  const apple = appleConfig();
  const google = googleConfig();

  const tasks: Promise<unknown>[] = [];

  if (apple) {
    tasks.push(
      (async () => {
        const tokens = await pushTokensFor(serials);
        const results = await pushPassUpdates(apple, tokens);
        const gone = results.filter((r) => r.gone).map((r) => r.pushToken);
        if (gone.length) await removePushTokens(gone);
      })(),
    );
  }

  if (google) {
    tasks.push(
      (async () => {
        const bundles = await cardsBySerials(serials);
        // Petits lots pour ne pas dépasser les quotas de l'API
        for (let i = 0; i < bundles.length; i += 10) {
          await Promise.all(
            bundles.slice(i, i + 10).map(async ({ card, program, customer }) => {
              await updateGoogleObject(google, card, program, customer);
              if (opts.message) await sendGoogleMessage(google, card, opts.message.header, opts.message.body);
            }),
          );
        }
      })(),
    );
  }

  const results = await Promise.allSettled(tasks);
  for (const r of results) if (r.status === "rejected") console.error("[wallet] notification échouée :", r.reason);
}

/** Réglages de la carte modifiés : met à jour la classe Google (boutiques, couleurs) puis les cartes. */
export function notifyProgramChanged(program: Program, serials: string[]) {
  const google = googleConfig();
  void (async () => {
    if (google) await updateGoogleClass(google, program);
    await notifyCardsChanged(serials);
  })().catch((e) => console.error("[wallet]", e));
}

/** Version "fire and forget" pour les routes API : ne retarde pas la réponse. */
export function notifyInBackground(serials: string[], opts?: NotifyOptions) {
  void notifyCardsChanged(serials, opts).catch((e) => console.error("[wallet]", e));
}
