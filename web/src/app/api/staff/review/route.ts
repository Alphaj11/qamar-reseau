// GET   /api/staff/review → réglages et chiffres de la demande d'avis Google (responsable)
// PATCH /api/staff/review { enabled?, url?, afterVisits?, message? } → modifie la demande d'avis
import { z } from "zod";
import { json, preflight, readJson, withStaff } from "@/lib/http";
import { isGoogleReviewUrl, reviewOverview, updateReview } from "@/lib/review";
import { notifyInBackground } from "@/lib/wallet/notify";

const body = z
  .object({
    enabled: z.boolean(),
    url: z
      .string()
      .trim()
      .max(300)
      .refine((v) => v === "" || isGoogleReviewUrl(v), "Collez le lien d'avis donné par Google (il commence par https://g.page/ ou https://search.google.com/)"),
    afterVisits: z.number().int().min(1, "1 visite minimum").max(20, "20 visites maximum"),
    message: z.string().trim().min(3, "Message trop court").max(150, "150 caractères maximum"),
  })
  .partial()
  .strict();

export const OPTIONS = preflight;

export function GET(request: Request) {
  return withStaff(request, async (staff) => json(await reviewOverview(staff)));
}

export function PATCH(request: Request) {
  return withStaff(request, async (staff) => {
    const parsed = body.safeParse(await readJson(request));
    if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "Réglages invalides" }, 400);
    const current = (await reviewOverview(staff)).settings;
    const next = { ...current, ...parsed.data };
    if (next.enabled && !next.url) return json({ error: "Ajoutez d'abord le lien d'avis de votre fiche Google" }, 400);
    const serials = await updateReview(staff, parsed.data);
    // Le lien au dos des cartes a changé : mise à jour silencieuse des Wallet
    notifyInBackground(serials);
    return json(await reviewOverview(staff));
  });
}
