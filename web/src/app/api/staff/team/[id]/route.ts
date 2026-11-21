// DELETE /api/staff/team/<id> → retire un vendeur (ses sessions sont fermées)
import { json, preflight, withStaff } from "@/lib/http";
import { removeTeamMember } from "@/lib/merchant";

export const OPTIONS = preflight;

export function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withStaff(request, async (staff) => {
    const { id } = await params;
    return (await removeTeamMember(staff, id)) ? json({ ok: true }) : json({ error: "Compte introuvable" }, 404);
  });
}
