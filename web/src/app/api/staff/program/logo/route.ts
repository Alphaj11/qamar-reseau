// POST   /api/staff/program/logo { image: base64 } → enregistre le logo du commerce (responsable)
// DELETE /api/staff/program/logo → revient à l'initiale
// L'image est revérifiée et redimensionnée ici (256 × 256 PNG) : on ne stocke jamais le fichier envoyé tel quel.
import sharp from "sharp";
import { z } from "zod";
import { json, preflight, readJson, withStaff } from "@/lib/http";
import { setLogo } from "@/lib/merchant";
import { notifyProgramChanged } from "@/lib/wallet/notify";

const MAX_BYTES = 6 * 1024 * 1024;
const body = z.object({ image: z.string().min(100).max(Math.ceil((MAX_BYTES * 4) / 3) + 100) });

export const OPTIONS = preflight;

export function POST(request: Request) {
  return withStaff(request, async (staff) => {
    const parsed = body.safeParse(await readJson(request));
    if (!parsed.success) return json({ error: "Image trop lourde ou invalide (6 Mo maximum)" }, 400);
    const raw = parsed.data.image.replace(/^data:image\/[a-z+]+;base64,/, "");
    let png: Buffer;
    try {
      png = await sharp(Buffer.from(raw, "base64"), { limitInputPixels: 40_000_000 })
        .rotate()
        .resize(256, 256, { fit: "cover" })
        .png({ compressionLevel: 9 })
        .toBuffer();
    } catch {
      return json({ error: "Ce fichier n'est pas une image lisible (JPEG, PNG, HEIC…)" }, 400);
    }
    const { settings, serials, program } = await setLogo(staff, `data:image/png;base64,${png.toString("base64")}`);
    if (serials.length) notifyProgramChanged(program, serials);
    return json({ settings });
  });
}

export function DELETE(request: Request) {
  return withStaff(request, async (staff) => {
    const { settings, serials, program } = await setLogo(staff, undefined);
    if (serials.length) notifyProgramChanged(program, serials);
    return json({ settings });
  });
}
