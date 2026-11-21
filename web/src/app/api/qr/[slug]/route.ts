// GET /api/qr/<slug> → QR code (PNG) qui ouvre la page d'inscription du commerce.
// C'est ce QR que le commerçant affiche en caisse ou partage.
import QRCode from "qrcode";
import { getProgramBySlug } from "@/lib/db";
import { publicUrl } from "@/lib/wallet/config";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const program = await getProgramBySlug(slug);
  if (!program) return new Response("Introuvable", { status: 404 });
  const png = await QRCode.toBuffer(`${publicUrl()}/c/${program.slug}`, { width: 720, margin: 2, errorCorrectionLevel: "M" });
  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=300", "Access-Control-Allow-Origin": "*" },
  });
}
