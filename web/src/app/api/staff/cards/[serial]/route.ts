// GET /api/staff/cards/<serial> → état à jour d'une carte scannée
import { json, preflight, withStaff } from "@/lib/http";
import { findCard } from "@/lib/staff";

export const OPTIONS = preflight;

export function GET(request: Request, { params }: { params: Promise<{ serial: string }> }) {
  return withStaff(request, async (staff) => {
    const { serial } = await params;
    const card = await findCard(staff, serial);
    if (!card) return json({ error: "Carte inconnue pour ce commerce" }, 404);
    return json({ card });
  });
}
