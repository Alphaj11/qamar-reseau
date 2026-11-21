// POST /api/staff/sync  { ops: [...] } → { results: [...] }
// Reçoit les passages en caisse (en direct ou accumulés hors ligne). Rejouable sans doublon.
import { z } from "zod";
import { json, preflight, withStaff } from "@/lib/http";
import { sync } from "@/lib/staff";
import { notifyInBackground } from "@/lib/wallet/notify";

const op = z.object({
  clientOpId: z.string().min(8).max(64),
  serial: z.string().min(4).max(64),
  kind: z.enum(["stamp", "points", "reward"]),
  amount: z.number().int(),
  occurredAt: z.iso.datetime(),
});
const body = z.object({ ops: z.array(op).max(500) });

export const OPTIONS = preflight;

export function POST(request: Request) {
  // Abonnement inactif : 402, l'appli garde les passages et les renverra après réactivation
  return withStaff(request, async (staff) => {
    const parsed = body.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return json({ error: "Requête invalide" }, 400);
    const { results, messages } = await sync(staff, parsed.data.ops);
    // Prévient les Wallet des cartes modifiées (nouvelle image de tampons, notification)
    const withMessage = new Set(messages.map((m) => m.serial));
    const changed = [...new Set(results.flatMap((x) => (x.status === "applied" ? [x.card.serial] : [])))];
    notifyInBackground(changed.filter((s) => !withMessage.has(s)));
    // Demande d'avis : notification Google en plus (sur iPhone, le changement de message suffit)
    for (const m of messages) notifyInBackground([m.serial], { message: { header: m.header, body: m.body } });
    return json({ results });
  });
}
