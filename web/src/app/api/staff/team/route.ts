// GET  /api/staff/team → comptes de la boutique (responsable)
// POST /api/staff/team { name, email, pin } → ajoute un vendeur
import { z } from "zod";
import { json, preflight, readJson, withStaff } from "@/lib/http";
import { addTeamMember, listTeam } from "@/lib/merchant";

const body = z.object({
  name: z.string().trim().min(1, "Indiquez un nom").max(40),
  email: z.email("E-mail invalide").max(120),
  pin: z.string().regex(/^\d{4,8}$/, "Code de 4 à 8 chiffres"),
});

export const OPTIONS = preflight;

export function GET(request: Request) {
  return withStaff(request, async (staff) => json({ team: await listTeam(staff) }));
}

export function POST(request: Request) {
  return withStaff(request, async (staff) => {
    const parsed = body.safeParse(await readJson(request));
    if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "Données invalides" }, 400);
    return json({ member: await addTeamMember(staff, parsed.data) }, 201);
  });
}
