// POST /api/stripe/webhook → évènements Stripe (paiement, renouvellement, résiliation).
// À déclarer dans le tableau de bord Stripe avec les évènements :
// checkout.session.completed, customer.subscription.updated, customer.subscription.deleted, invoice.payment_failed
import { applyStripeEvent, verifyStripeSignature } from "@/lib/subscription";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return new Response("Stripe non configuré", { status: 503 });
  const payload = await request.text();
  if (!verifyStripeSignature(payload, request.headers.get("stripe-signature"), secret)) {
    return new Response("Signature invalide", { status: 400 });
  }
  try {
    await applyStripeEvent(JSON.parse(payload));
  } catch (e) {
    console.error("[stripe]", e);
    return new Response("Erreur", { status: 500 });
  }
  return new Response("ok");
}
