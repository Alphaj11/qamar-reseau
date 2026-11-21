// GET   /api/staff/birthday → réglages et chiffres de l'offre d'anniversaire (responsable)
// PATCH /api/staff/birthday { enabled?, gift?, message? } → modifie l'offre
import { z } from "zod";
import { json, preflight, readJson, withStaff } from "@/lib/http";
import { birthdayOverview, updateBirthday } from "@/lib/birthday";

const body = z
  .object({
    enabled: z.boolean(),
    gift: z.boolean(),
    message: z.string().trim().min(3, "Message trop court").max(150, "150 caractères maximum"),
  })
  .partial()
  .strict();

export const OPTIONS = preflight;

export function GET(request: Request) {
  return withStaff(request, async (staff) => json(await birthdayOverview(staff)));
}

export function PATCH(request: Request) {
  return withStaff(request, async (staff) => {
    const parsed = body.safeParse(await readJson(request));
    if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "Réglages invalides" }, 400);
    await updateBirthday(staff, parsed.data);
    return json(await birthdayOverview(staff));
  });
}
