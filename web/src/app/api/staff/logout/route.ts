// POST /api/staff/logout → ferme la session côté serveur (le jeton ne marche plus).
import { json, preflight } from "@/lib/http";
import { revokeSession } from "@/lib/merchant";

export const OPTIONS = preflight;

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (token) await revokeSession(token);
  return json({ ok: true });
}
