// Génère la bannière ("strip image") de la carte : tampons remplis ou barre de points.
// Le Wallet n'a pas de composant "tampon" : on régénère cette image à chaque passage.
import "server-only";
import sharp from "sharp";
import { isStampIcon, patternSvg, STAMP_ICONS } from "./card-design";
import type { Program } from "./types";

/** Formats imposés par Apple et Google (en pixels). */
export const STRIP_FORMATS = {
  apple: { width: 1125, height: 432 }, // storeCard strip @3x (375 x 144 pt)
  google: { width: 1032, height: 336 }, // hero image Google Wallet
  preview: { width: 750, height: 288 },
} as const;
export type StripFormat = keyof typeof STRIP_FORMATS;

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** Répartit n tampons sur 1 à 3 lignes. */
function grid(n: number) {
  const rows = n <= 6 ? 1 : n <= 16 ? 2 : 3;
  return { rows, cols: Math.ceil(n / rows) };
}

function stampsSvg(p: Program, stamps: number, w: number, h: number) {
  const n = p.stampsRequired;
  const { rows, cols } = grid(n);
  const padX = w * 0.06;
  const padY = h * 0.12;
  const cellW = (w - 2 * padX) / cols;
  const cellH = (h - 2 * padY) / rows;
  const d = Math.min(cellW, cellH) * 0.8;
  const r = d / 2;
  const stroke = Math.max(2, d * 0.045);
  const icon = STAMP_ICONS[isStampIcon(p.stampIcon) ? p.stampIcon : "star"].svg;

  let out = "";
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / cols);
    // centre la dernière ligne si elle est incomplète
    const inRow = row === rows - 1 ? n - cols * (rows - 1) : cols;
    const col = i % cols;
    const offset = ((cols - inRow) * cellW) / 2;
    const cx = padX + offset + cellW * col + cellW / 2;
    const cy = padY + cellH * row + cellH / 2;
    const filled = i < stamps;
    const s = (d * 0.62) / 24;

    out += filled
      ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${p.accentColor}"/>`
      : `<circle cx="${cx}" cy="${cy}" r="${r - stroke / 2}" fill="none" stroke="${p.fgColor}" stroke-opacity="0.45" stroke-width="${stroke}" stroke-dasharray="${stroke * 2.2} ${stroke * 1.6}"/>`;
    out += `<g transform="translate(${cx - 12 * s} ${cy - 12 * s}) scale(${s})" color="${
      filled ? p.bgColor : p.fgColor
    }" opacity="${filled ? 1 : 0.22}">${icon}</g>`;
  }
  return out;
}

function pointsSvg(p: Program, points: number, w: number, h: number) {
  const ratio = Math.max(0, Math.min(1, points / p.pointsRequired));
  const padX = w * 0.07;
  const barH = h * 0.14;
  const barY = h * 0.6;
  const barW = w - 2 * padX;
  const big = h * 0.26;
  const small = h * 0.1;
  return `
    <text x="${padX}" y="${h * 0.44}" font-family="Helvetica, Arial, sans-serif" font-weight="700" font-size="${big}" fill="${p.fgColor}">${points}<tspan font-size="${big * 0.45}" font-weight="500" fill-opacity="0.7"> / ${p.pointsRequired} pts</tspan></text>
    <rect x="${padX}" y="${barY}" width="${barW}" height="${barH}" rx="${barH / 2}" fill="${p.fgColor}" fill-opacity="0.15"/>
    <rect x="${padX}" y="${barY}" width="${Math.max(barH, barW * ratio)}" height="${barH}" rx="${barH / 2}" fill="${p.accentColor}"/>
    <text x="${padX}" y="${barY + barH + small * 1.6}" font-family="Helvetica, Arial, sans-serif" font-size="${small}" fill="${p.fgColor}" fill-opacity="0.75">${esc(p.rewardLabel)}</text>`;
}

export function stripSvg(p: Program, value: number, format: StripFormat = "preview") {
  const { width: w, height: h } = STRIP_FORMATS[format];
  const body = p.type === "stamps" ? stampsSvg(p, value, w, h) : pointsSvg(p, value, w, h);
  const deco = p.pattern && isStampIcon(p.stampIcon) ? patternSvg(p.stampIcon, w, h, p.fgColor) : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <rect width="100%" height="100%" fill="${p.bgColor}"/>${deco}${body}</svg>`;
}

export async function stripPng(p: Program, value: number, format: StripFormat = "preview") {
  return sharp(Buffer.from(stripSvg(p, value, format))).png().toBuffer();
}
