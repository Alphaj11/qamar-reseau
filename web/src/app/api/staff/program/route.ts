// GET   /api/staff/program → réglages de la carte
// PATCH /api/staff/program → modifier la carte (responsable) ; met à jour les cartes dans les Wallet
import { z } from "zod";
import { STAMP_ICON_IDS, type StampIcon } from "@/lib/card-design";
import { json, preflight, readJson, withStaff } from "@/lib/http";
import { getSettings, updateSettings } from "@/lib/merchant";
import { notifyProgramChanged } from "@/lib/wallet/notify";

const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur au format #RRGGBB");

const patchSchema = z
  .object({
    name: z.string().trim().min(1).max(40),
    merchantName: z.string().trim().min(1).max(40),
    type: z.enum(["stamps", "points"]),
    rewardLabel: z.string().trim().min(1).max(60),
    stampsRequired: z.number().int().min(3).max(20),
    pointsRequired: z.number().int().min(10).max(100000),
    pointsPerEuro: z.number().min(0.1).max(100),
    welcomeBonus: z.number().int().min(0).max(1000),
    bgColor: color,
    fgColor: color,
    accentColor: color,
    stampIcon: z.enum(STAMP_ICON_IDS as [StampIcon, ...StampIcon[]]),
    template: z.string().trim().max(30),
    pattern: z.boolean(),
    terms: z.string().trim().max(500),
    locations: z
      .array(
        z.object({
          latitude: z.number().min(-90).max(90),
          longitude: z.number().min(-180).max(180),
          relevantText: z.string().trim().max(80).optional(),
        }),
      )
      .max(10),
    averageBasket: z.number().min(0).max(10000),
  })
  .partial()
  .strict();

export const OPTIONS = preflight;

export function GET(request: Request) {
  return withStaff(request, async (staff) => json({ settings: await getSettings(staff) }));
}

export function PATCH(request: Request) {
  return withStaff(request, async (staff) => {
    const parsed = patchSchema.safeParse(await readJson(request));
    if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "Réglages invalides" }, 400);
    const { settings, serials, program } = await updateSettings(staff, parsed.data);
    if (serials.length) notifyProgramChanged(program, serials);
    return json({ settings });
  });
}
