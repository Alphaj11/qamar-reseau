// GET /api/staff/home → résumé du jour, activité récente, premiers pas
import { json, preflight, withStaff } from "@/lib/http";
import { home } from "@/lib/merchant";

export const OPTIONS = preflight;

export function GET(request: Request) {
  return withStaff(request, async (staff) => json(await home(staff)));
}
