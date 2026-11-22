// POST   /api/staff/program/banner { image: base64 } → photo de fond de la bannière (responsable)
// DELETE /api/staff/program/banner → revient au fond uni
// Comme pour le logo, l'image est revérifiée et recadrée ici (1125 × 432, format de la bannière Apple @3x) :
// on ne stocke jamais le fichier envoyé tel quel.
import sharp from "sharp";
import { z } from "zod";
import { json, preflight, readJson, withStaff } from "@/lib/http";
import { setBanner } from "@/lib/merchant";
import { STRIP_FORMATS } from "@/lib/stamp-image";
import { notifyProgramChanged } from "@/lib/wallet/notify";

const MAX_BYTES = 8 * 1024 * 1024;
const body = z.object({ image: z.string().min(100).max(Math.ceil((MAX_BYTES * 4) / 3) + 100) });

export const OPTIONS = preflight;

export function POST(request: Request) {
  return withStaff(request, async (staff) => {
    const parsed = body.safeParse(await readJson(request));
    if (!parsed.success) return json({ error: "Image trop lourde ou invalide (8 Mo maximum)" }, 400);
    const raw = parsed.data.image.replace(/^data:image\/[a-z+]+;base64,/, "");
    const { width, height } = STRIP_FORMATS.apple;
    let jpeg: Buffer;
    try {
      jpeg = await sharp(Buffer.from(raw, "base64"), { limitInputPixels: 60_000_000 })
        .rotate()
        .resize(width, height, { fit: "cover", position: "attention" })
        .jpeg({ quality: 78, mozjpeg: true })
        .toBuffer();
    } catch {
      return json({ error: "Ce fichier n'est pas une image lisible (JPEG, PNG, HEIC…)" }, 400);
    }
    const { settings, serials, program } = await setBanner(staff, `data:image/jpeg;base64,${jpeg.toString("base64")}`);
    if (serials.length) notifyProgramChanged(program, serials);
    return json({ settings });
  });
}

export function DELETE(request: Request) {
  return withStaff(request, async (staff) => {
    const { settings, serials, program } = await setBanner(staff, undefined);
    if (serials.length) notifyProgramChanged(program, serials);
    return json({ settings });
  });
}
