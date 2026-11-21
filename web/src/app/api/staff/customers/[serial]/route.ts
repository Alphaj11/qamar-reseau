// GET /api/staff/customers/<serial> → fiche client + historique des passages
import { json, preflight, withStaff } from "@/lib/http";
import { customerDetail, deleteCustomer } from "@/lib/merchant";

export const OPTIONS = preflight;

export function GET(request: Request, { params }: { params: Promise<{ serial: string }> }) {
  return withStaff(request, async (staff) => {
    const { serial } = await params;
    const detail = await customerDetail(staff, serial);
    return detail ? json(detail) : json({ error: "Client introuvable" }, 404);
  });
}

// DELETE /api/staff/customers/<serial> → efface le client et ses données (responsable)
export function DELETE(request: Request, { params }: { params: Promise<{ serial: string }> }) {
  return withStaff(request, async (staff) => {
    const { serial } = await params;
    return (await deleteCustomer(staff, serial)) ? json({ ok: true }) : json({ error: "Client introuvable" }, 404);
  });
}
