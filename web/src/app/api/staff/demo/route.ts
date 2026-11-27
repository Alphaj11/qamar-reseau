// POST /api/staff/demo → session sur la boutique de démonstration (lecture seule), sans compte.
import { json, preflight } from "@/lib/http";
import { clientIp, hit, tooMany } from "@/lib/ratelimit";
import { startDemoSession } from "@/lib/showcase";

export const OPTIONS = preflight;

export async function POST(request: Request) {
  const wait = await hit(`demo:${clientIp(request.headers)}`, 30, 60 * 60_000);
  if (wait) return json({ error: tooMany(wait) }, 429);
  return json(await startDemoSession());
}
