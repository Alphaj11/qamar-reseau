// GET /api/wallet/google/logo/<slug> → logo du programme, chargé par Google Wallet.
import { getProgramBySlug } from "@/lib/db";
import { googleLogoPng } from "@/lib/wallet/images";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const program = await getProgramBySlug(slug);
  if (!program) return new Response("Introuvable", { status: 404 });
  return new Response(new Uint8Array(await googleLogoPng(program)), {
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600" },
  });
}
