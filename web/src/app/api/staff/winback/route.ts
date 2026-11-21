// GET /api/staff/winback → réglages et résultats de la relance des clients absents (responsable)
// PATCH /api/staff/winback { enabled?, days?, message? } → modifie la relance
import { z } from "zod";
import { json, preflight, readJson, withStaff } from "@/lib/http";
import { updateWinback, winbackOverview } from "@/lib/winback";

const body = z
  .object({
    enabled: z.boolean(),
    days: z.number().int().min(14, "14 jours minimum").max(180, "180 jours maximum"),
    message: z.string().trim().min(3, "Message trop court").max(150, "150 caractères maximum"),
  })
  .partial()
  .strict();

export const OPTIONS = preflight;

export function GET(request: Request) {
  return withStaff(request, async (staff) => json(await winbackOverview(staff)));
}

export function PATCH(request: Request) {
  return withStaff(request, async (staff) => {
    const parsed = body.safeParse(await readJson(request));
    if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "Réglages invalides" }, 400);
    await updateWinback(staff, parsed.data);
    return json(await winbackOverview(staff));
  });
}
