// GET /api/wallet/apple/<cardId> → télécharge la carte .pkpass (bouton "Ajouter à Apple Wallet").
// L'identifiant de carte (UUID) n'est connu que du client : c'est lui qui protège le lien.
import { buildApplePass, PKPASS_MIME } from "@/lib/wallet/apple";
import { cardById } from "@/lib/wallet/registry";

export async function GET(_request: Request, { params }: { params: Promise<{ cardId: string }> }) {
  const { cardId } = await params;
  const bundle = await cardById(cardId);
  if (!bundle) return new Response("Carte introuvable", { status: 404 });
  const file = await buildApplePass(bundle.card, bundle.program, bundle.customer);
  if (!file) return new Response("Apple Wallet n'est pas encore configuré", { status: 503 });
  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": PKPASS_MIME,
      "Content-Disposition": `attachment; filename="${bundle.program.slug}.pkpass"`,
      "Cache-Control": "no-store",
    },
  });
}
