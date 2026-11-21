// Images des cartes Wallet générées à partir des couleurs du commerçant.
// (Le logo personnalisé du commerçant remplacera l'initiale quand l'upload sera en place.)
import "server-only";
import sharp from "sharp";
import { stripPng } from "../stamp-image";
import type { Program } from "../types";

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** Pastille ronde avec l'initiale du commerce. */
function badgeSvg(p: Program, size: number) {
  const r = size / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <circle cx="${r}" cy="${r}" r="${r}" fill="${p.accentColor}"/>
    <text x="50%" y="50%" dy="0.35em" text-anchor="middle" font-family="Helvetica, Arial, sans-serif"
      font-weight="700" font-size="${size * 0.5}" fill="${p.bgColor}">${esc(p.merchantName.charAt(0).toUpperCase())}</text>
  </svg>`;
}

const png = (svg: string) => sharp(Buffer.from(svg)).png().toBuffer();

/** Logo du commerçant s'il en a envoyé un, sinon pastille avec l'initiale. */
function logoPng(p: Program, size: number) {
  const data = p.logo?.match(/^data:image\/png;base64,(.+)$/)?.[1];
  if (!data) return png(badgeSvg(p, size));
  return sharp(Buffer.from(data, "base64"))
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

/** Fichiers images d'une carte Apple (icône, logo, bannière) en 1x / 2x / 3x. */
export async function applePassImages(p: Program, value: number): Promise<Record<string, Buffer>> {
  const strip3 = await stripPng(p, value, "apple"); // 1125 x 432
  const resize = (w: number, h: number) => sharp(strip3).resize(w, h).png().toBuffer();
  const [icon, icon2, icon3, logo, logo2, logo3, strip, strip2] = await Promise.all([
    logoPng(p, 29),
    logoPng(p, 58),
    logoPng(p, 87),
    logoPng(p, 50),
    logoPng(p, 100),
    logoPng(p, 150),
    resize(375, 144),
    resize(750, 288),
  ]);
  return {
    "icon.png": icon,
    "icon@2x.png": icon2,
    "icon@3x.png": icon3,
    "logo.png": logo,
    "logo@2x.png": logo2,
    "logo@3x.png": logo3,
    "strip.png": strip,
    "strip@2x.png": strip2,
    "strip@3x.png": strip3,
  };
}

/** Logo carré pour Google Wallet (servi par URL publique). */
export const googleLogoPng = (p: Program) => logoPng(p, 660);
