// POST /api/staff/login  { email, pin } → { token, staff }
import { z } from "zod";
import { json, preflight } from "@/lib/http";
import { clientIp, hit, tooMany } from "@/lib/ratelimit";
import { LockedError, login } from "@/lib/staff";

const body = z.object({ email: z.string().max(120), pin: z.string().regex(/^\d{4,8}$/) });

export const OPTIONS = preflight;

export async function POST(request: Request) {
  // 20 essais / 15 min par adresse IP : empêche d'essayer un code sur beaucoup de comptes
  const wait = await hit(`login:${clientIp(request.headers)}`, 20, 15 * 60_000);
  if (wait) return json({ error: tooMany(wait) }, 429);
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: "E-mail ou code incorrect" }, 400);
  let session;
  try {
    session = await login(parsed.data.email, parsed.data.pin);
  } catch (e) {
    if (e instanceof LockedError) return json({ error: e.message }, 429);
    throw e;
  }
  if (!session) return json({ error: "E-mail ou code incorrect" }, 401);
  return json(session);
}
