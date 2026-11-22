// GET /api/staff/export/link?format=…&data=…&days=… → { path } : chemin de téléchargement valable 2 minutes, une seule fois.
// Sert à l'appli téléphone : elle ouvre ce lien dans le navigateur, qui affiche ou enregistre le fichier,
// sans que la session du vendeur apparaisse dans l'adresse.
import { requireOwner } from "@/lib/merchant";
import { issueDownloadToken } from "@/lib/export-links";
import { json, preflight, withStaff } from "@/lib/http";

export const OPTIONS = preflight;

export function GET(request: Request) {
  return withStaff(request, async (staff) => {
    requireOwner(staff);
    const session = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
    const src = new URL(request.url);
    // On renvoie seulement le chemin : l'appli le préfixe avec l'adresse du serveur qu'elle connaît déjà.
    const target = new URL("/api/staff/export", src.origin);
    for (const k of ["format", "data", "days"]) {
      const v = src.searchParams.get(k);
      if (v) target.searchParams.set(k, v);
    }
    target.searchParams.set("t", issueDownloadToken(session));
    return json({ path: `${target.pathname}${target.search}` });
  });
}
