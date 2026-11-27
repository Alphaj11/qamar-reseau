// GET /api/staff/export?format=csv|xlsx|pdf&data=clients|passages&days=30 → fichier à télécharger (responsable)
// Authentification : en-tête « Authorization: Bearer … » (version web de l'appli),
// ou lien à usage unique ?t=… obtenu par /api/staff/export/link (téléphone : le fichier s'ouvre dans le navigateur).
import { z } from "zod";
import { buildExport } from "@/lib/export";
import { takeDownloadToken } from "@/lib/export-links";
import { CORS, json, preflight, withStaff } from "@/lib/http";

export const OPTIONS = preflight;

const query = z.object({
  format: z.enum(["csv", "xlsx", "pdf"]).default("csv"),
  data: z.enum(["clients", "passages"]).default("clients"),
  days: z.coerce.number().int().min(1).max(3660).default(30),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = query.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) return json({ error: "Paramètres d'export invalides" }, 400);
  const { format, data, days } = parsed.data;

  // Lien à usage unique : on retrouve la session qui l'a demandé
  const t = url.searchParams.get("t");
  let req = request;
  if (t) {
    const session = await takeDownloadToken(t);
    if (!session) return json({ error: "Lien expiré, relancez l'export depuis l'appli" }, 401);
    req = new Request(request.url, { headers: { Authorization: `Bearer ${session}` } });
  }

  return withStaff(req, async (staff) => {
    const file = await buildExport(staff, format, data, days);
    return new Response(new Uint8Array(typeof file.body === "string" ? Buffer.from(file.body, "utf-8") : file.body), {
      headers: {
        "Content-Type": file.type,
        "Content-Disposition": `attachment; filename="${file.filename}"`,
        ...CORS,
        "Access-Control-Expose-Headers": "Content-Disposition",
        "Cache-Control": "no-store",
      },
    });
  });
}
