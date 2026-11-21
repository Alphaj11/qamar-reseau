// GET /api/staff/snapshot → programmes + cartes du commerçant (cache hors ligne de l'appli)
import { json, preflight, withStaff } from "@/lib/http";
import { snapshot } from "@/lib/staff";

export const OPTIONS = preflight;

export function GET(request: Request) {
  return withStaff(request, async (staff) => json(await snapshot(staff)));
}
