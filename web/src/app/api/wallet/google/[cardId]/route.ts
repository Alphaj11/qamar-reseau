// GET /api/wallet/google/<cardId> → redirige vers "Ajouter à Google Wallet".
import { googleConfig } from "@/lib/wallet/config";
import { googleSaveUrl } from "@/lib/wallet/google";
import { cardById } from "@/lib/wallet/registry";

export async function GET(_request: Request, { params }: { params: Promise<{ cardId: string }> }) {
  const { cardId } = await params;
  const cfg = googleConfig();
  if (!cfg) return new Response("Google Wallet n'est pas encore configuré", { status: 503 });
  const bundle = await cardById(cardId);
  if (!bundle) return new Response("Carte introuvable", { status: 404 });
  return Response.redirect(googleSaveUrl(cfg, bundle.card, bundle.program, bundle.customer), 302);
}
