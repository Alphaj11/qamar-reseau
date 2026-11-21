// GET  /api/staff/campaigns → messages envoyés
// POST /api/staff/campaigns { message } → envoie un message (notification sur les cartes Wallet)
import { z } from "zod";
import { json, preflight, readJson, withStaff } from "@/lib/http";
import { CAMPAIGNS_PER_DAY, listCampaigns, requireOwner, sendCampaign } from "@/lib/merchant";
import { notifyInBackground } from "@/lib/wallet/notify";

const body = z.object({ message: z.string().trim().min(3, "Message trop court").max(150, "150 caractères maximum") });

export const OPTIONS = preflight;

export function GET(request: Request) {
  return withStaff(request, async (staff) => {
    requireOwner(staff);
    const campaigns = await listCampaigns(staff);
    const dayAgo = new Date(Date.now() - 86400_000).toISOString();
    const remainingToday = Math.max(0, CAMPAIGNS_PER_DAY - campaigns.filter((c) => c.createdAt >= dayAgo).length);
    return json({ campaigns, perDay: CAMPAIGNS_PER_DAY, remainingToday });
  });
}

export function POST(request: Request) {
  return withStaff(request, async (staff) => {
    const parsed = body.safeParse(await readJson(request));
    if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "Message invalide" }, 400);
    const { campaign, serials, merchantName } = await sendCampaign(staff, parsed.data.message);
    notifyInBackground(serials, { message: { header: merchantName, body: parsed.data.message } });
    return json({ campaign }, 201);
  });
}
