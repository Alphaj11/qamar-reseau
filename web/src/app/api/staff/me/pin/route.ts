// POST /api/staff/me/pin { current, next } → change son propre code
import { z } from "zod";
import { json, preflight, readJson, withStaff } from "@/lib/http";
import { changePin } from "@/lib/merchant";

const body = z.object({
  current: z.string().regex(/^\d{4,8}$/, "Code actuel incorrect"),
  next: z.string().regex(/^\d{6,8}$/, "Nouveau code : 6 à 8 chiffres"),
});

export const OPTIONS = preflight;

export function POST(request: Request) {
  return withStaff(
    request,
    async (staff) => {
      const parsed = body.safeParse(await readJson(request));
      if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "Code invalide" }, 400);
      await changePin(staff, parsed.data.current, parsed.data.next);
      return json({ ok: true });
    },
    { allowInactive: true },
  );
}
