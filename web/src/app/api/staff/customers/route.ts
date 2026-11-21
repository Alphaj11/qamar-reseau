// GET /api/staff/customers?q=<recherche> → liste des clients du commerce
import { json, preflight, withStaff } from "@/lib/http";
import { listCustomers } from "@/lib/merchant";

export const OPTIONS = preflight;

export function GET(request: Request) {
  return withStaff(request, async (staff) => {
    const q = (new URL(request.url).searchParams.get("q") ?? "").slice(0, 100);
    return json({ customers: await listCustomers(staff, q) });
  });
}
