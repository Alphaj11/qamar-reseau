// GET /api/staff/export → fichier CSV des clients (responsable)
import { preflight, withStaff } from "@/lib/http";
import { exportCustomersCsv, parisDay } from "@/lib/merchant";

export const OPTIONS = preflight;

export function GET(request: Request) {
  return withStaff(request, async (staff) => {
    const csv = await exportCustomersCsv(staff);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="clients-${parisDay(Date.now())}.csv"`,
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
      },
    });
  });
}
