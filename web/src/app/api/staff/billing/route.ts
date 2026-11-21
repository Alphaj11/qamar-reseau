// POST /api/staff/billing → lien vers le paiement (compte en attente) ou l'espace de facturation Stripe.
// Utilisé uniquement depuis le web : l'appli iPhone/Android ne propose aucun achat (règle des stores).
import { load } from "@/lib/db";
import { json, preflight, withStaff } from "@/lib/http";
import { requireOwner } from "@/lib/merchant";
import { createCheckout, createPortal, stripeConfig } from "@/lib/subscription";
import { publicUrl } from "@/lib/wallet/config";

export const OPTIONS = preflight;

export function POST(request: Request) {
  return withStaff(
    request,
    async (staff) => {
      requireOwner(staff);
      const merchant = (await load()).merchants.find((m) => m.id === staff.merchantId);
      if (!merchant) return json({ error: "Commerce introuvable" }, 404);
      if (!stripeConfig()) return json({ url: `${publicUrl()}/inscription/merci?m=${merchant.id}` });
      const url = merchant.subscription.stripeCustomerId
        ? await createPortal(merchant)
        : await createCheckout(merchant, staff.email);
      return json({ url });
    },
    { allowInactive: true },
  );
}
