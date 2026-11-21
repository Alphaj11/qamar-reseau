// GET /api/staff/stats?days=30 → chiffres clés du commerce (responsable uniquement)
import { json, preflight, withStaff } from "@/lib/http";
import { requireOwner, stats } from "@/lib/merchant";

export const OPTIONS = preflight;

export function GET(request: Request) {
  return withStaff(request, async (staff) => {
    requireOwner(staff);
    const raw = Number(new URL(request.url).searchParams.get("days") ?? 30);
    const days = [7, 30, 90, 365].includes(raw) ? raw : 30;
    return json(await stats(staff, days));
  });
}
