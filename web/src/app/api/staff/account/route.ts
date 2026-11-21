// GET /api/staff/account → compte, commerce et abonnement (accessible même sans abonnement actif)
// DELETE /api/staff/account { confirm } → supprime le compte (vendeur : son accès ; responsable : tout le commerce)
import { z } from "zod";
import { load } from "@/lib/db";
import { json, preflight, readJson, withStaff } from "@/lib/http";
import { deleteAccount } from "@/lib/merchant";
import { cancelStripeSubscription, subscriptionView } from "@/lib/subscription";
import { publicUrl } from "@/lib/wallet/config";

export const OPTIONS = preflight;

export function GET(request: Request) {
  return withStaff(
    request,
    async (staff) => {
      const db = await load();
      const merchant = db.merchants.find((m) => m.id === staff.merchantId);
      const program = db.programs.find((p) => p.merchantId === staff.merchantId);
      return json({
        staff: { id: staff.id, name: staff.name, email: staff.email, role: staff.role },
        merchant: { id: staff.merchantId, name: merchant?.name ?? program?.merchantName ?? "" },
        subscription: merchant ? subscriptionView(merchant) : null,
        enrollUrl: program ? `${publicUrl()}/c/${program.slug}` : null,
        posterUrl: program ? `${publicUrl()}/c/${program.slug}/affiche` : null,
        qrUrl: program ? `${publicUrl()}/api/qr/${program.slug}` : null,
        webUrl: publicUrl(),
      });
    },
    { allowInactive: true },
  );
}

const deleteBody = z.object({ confirm: z.literal("SUPPRIMER") });

export function DELETE(request: Request) {
  return withStaff(
    request,
    async (staff) => {
      if (!deleteBody.safeParse(await readJson(request)).success) {
        return json({ error: "Tapez SUPPRIMER pour confirmer" }, 400);
      }
      if (staff.role === "owner") {
        // Résilier d'abord : si Stripe échoue, rien n'est supprimé (sinon le commerçant serait prélevé sans plus avoir de compte)
        const db = await load();
        const subId = db.merchants.find((m) => m.id === staff.merchantId)?.subscription.stripeSubscriptionId;
        if (subId) await cancelStripeSubscription(subId);
      }
      const result = await deleteAccount(staff);
      return json({ ok: true, scope: result.scope });
    },
    { allowInactive: true },
  );
}
