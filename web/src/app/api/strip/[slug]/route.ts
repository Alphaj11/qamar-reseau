// GET /api/strip/<slug>?value=3&format=apple  → PNG de la bannière
// Sert à l'aperçu dans l'éditeur, et plus tard aux cartes Apple / Google.
import { getProgramBySlug } from "@/lib/db";
import { STRIP_FORMATS, stripPng, type StripFormat } from "@/lib/stamp-image";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const program = await getProgramBySlug(slug);
  if (!program) return new Response("Programme introuvable", { status: 404 });

  const url = new URL(request.url);
  const value = Math.max(0, Number.parseInt(url.searchParams.get("value") ?? "0", 10) || 0);
  const f = url.searchParams.get("format") ?? "preview";
  const format: StripFormat = f in STRIP_FORMATS ? (f as StripFormat) : "preview";

  const png = await stripPng(program, value, format);
  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=300" },
  });
}
