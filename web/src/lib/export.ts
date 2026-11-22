// Fichiers d'export pour le commerçant : Excel (3 onglets), CSV (clients ou passages) et PDF (rapport à imprimer).
// Tout est calculé à partir de exportData() : les trois formats racontent la même chose.
import "server-only";
import ExcelJS from "exceljs";
import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import { exportData, parisDay, type CustomerRow, type PassageRow } from "./merchant";
import type { Program, Staff } from "./types";

export type ExportFormat = "csv" | "xlsx" | "pdf";
export type ExportDataset = "clients" | "passages";

type Data = Awaited<ReturnType<typeof exportData>>;

const timeFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" });
const frDay = (iso: string) => parisDay(iso).split("-").reverse().join("/");
const birthday = (b?: string) => (b ? `${b.slice(3)}/${b.slice(0, 2)}` : "");

function operation(p: PassageRow) {
  if (p.kind === "reward") return "Récompense utilisée";
  if (p.kind === "points") return `+${p.amount} point${p.amount > 1 ? "s" : ""}`;
  return `+${p.amount} tampon${p.amount > 1 ? "s" : ""}`;
}

// ——— Tableaux communs ———

function customerTable(program: Program, list: CustomerRow[]) {
  const stamps = program.type === "stamps";
  return {
    header: ["Prénom", "E-mail", "Téléphone", "Accepte les offres", "Anniversaire", stamps ? "Tampons" : "Points", "Récompenses disponibles", "Récompenses utilisées", "Passages", "Dernier passage", "Inscrit le", "N° de carte"],
    rows: list.map((r) => [
      r.firstName,
      r.email ?? "",
      r.phone ?? "",
      r.marketingConsent ? "oui" : "non",
      birthday(r.birthday),
      stamps ? r.stamps : r.points,
      r.rewardsAvailable,
      r.rewardsRedeemed,
      r.visits,
      r.lastVisitAt ? frDay(r.lastVisitAt) : "",
      frDay(r.createdAt),
      r.serial,
    ]),
  };
}

function passageTable(list: PassageRow[]) {
  return {
    header: ["Date", "Heure", "Client", "Opération", "Quantité", "Vendeur", "N° de carte"],
    rows: list.map((p) => [frDay(p.occurredAt), timeFmt.format(new Date(p.occurredAt)), p.firstName, operation(p), p.kind === "reward" ? 1 : p.amount, p.by, p.serial]),
  };
}

function summary(d: Data): [string, string | number][] {
  const s = d.stats;
  const stamps = d.program.type === "stamps";
  return [
    ["Commerce", d.program.merchantName],
    ["Période", `${d.days} derniers jours (au ${frDay(new Date().toISOString())})`],
    ["Passages", s.visits],
    ["Clients venus", s.activeCustomers],
    ["Nouveaux clients", s.newCustomers],
    ["Récompenses utilisées", s.rewardsRedeemed],
    ["Récompenses gagnées, pas encore utilisées", s.rewardsPending],
    [stamps ? "Tampons donnés" : "Points donnés", stamps ? s.stampsGiven : s.pointsGiven],
    ["Taux de retour", s.returningRate === null ? "—" : `${s.returningRate} %`],
    ["Clients inscrits (total)", s.customers],
    ["Acceptent les messages", `${s.optIn} sur ${s.customers}`],
    ["Clients à relancer (30 jours sans passage)", s.inactiveCustomers],
    ...(s.estimatedRevenue !== null ? ([["Chiffre d'affaires estimé des passages", `${s.estimatedRevenue} €`]] as [string, string][]) : []),
  ];
}

// ——— CSV ———

const csvCell = (v: unknown) => {
  const s = v === undefined || v === null ? "" : String(v);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

function csv(header: string[], rows: unknown[][]) {
  // Point-virgule et BOM : Excel en français l'ouvre directement avec les accents.
  return "﻿" + [header, ...rows].map((r) => r.map(csvCell).join(";")).join("\r\n");
}

// ——— Excel ———

async function xlsx(d: Data) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Qamar Réseaux";
  wb.created = new Date();
  const accent = "FFFC4F00";

  const head = (ws: ExcelJS.Worksheet) => {
    const row = ws.getRow(1);
    row.font = { bold: true, color: { argb: "FFFFFFFF" } };
    row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0D0D0F" } };
    row.height = 22;
    ws.views = [{ state: "frozen", ySplit: 1 }];
  };
  const fit = (ws: ExcelJS.Worksheet) => {
    ws.columns.forEach((c) => {
      let max = 8;
      c.eachCell?.({ includeEmpty: false }, (cell) => (max = Math.max(max, String(cell.value ?? "").length + 2)));
      c.width = Math.min(max, 42);
    });
  };

  const res = wb.addWorksheet("Résumé");
  res.addRow(["Indicateur", "Valeur"]);
  for (const [k, v] of summary(d)) res.addRow([k, v]);
  head(res);
  res.getColumn(1).font = { bold: true };
  res.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  res.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: accent } };
  res.getCell("B1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: accent } };
  fit(res);

  const c = customerTable(d.program, d.customers);
  const cs = wb.addWorksheet("Clients");
  cs.addRow(c.header);
  c.rows.forEach((r) => cs.addRow(r));
  head(cs);
  cs.autoFilter = { from: "A1", to: { row: 1, column: c.header.length } };
  fit(cs);

  const p = passageTable(d.passages);
  const ps = wb.addWorksheet("Passages");
  ps.addRow(p.header);
  p.rows.forEach((r) => ps.addRow(r));
  head(ps);
  ps.autoFilter = { from: "A1", to: { row: 1, column: p.header.length } };
  fit(ps);

  return Buffer.from(await wb.xlsx.writeBuffer());
}

// ——— PDF ———

const A4 = { w: 595.28, h: 841.89 };
const M = 40;
const ink = rgb(0.05, 0.05, 0.06);
const muted = rgb(0.43, 0.42, 0.39);
const orange = rgb(0.988, 0.31, 0);
const line = rgb(0.88, 0.87, 0.85);

/** Les polices standard du PDF ne couvrent que le latin (WinAnsi) : on remplace le reste. */
const safe = (s: string) =>
  s
    .replace(/[’‘]/g, "'")
    .replace(/[“”«»]/g, '"')
    .replace(/[−–—]/g, "-")
    .replace(/ | /g, " ")
    .replace(/[^\x20-\x7E -ÿ€œŒ]/g, "");

function fitText(text: string, font: PDFFont, size: number, max: number) {
  let t = safe(text);
  if (font.widthOfTextAtSize(t, size) <= max) return t;
  while (t.length > 1 && font.widthOfTextAtSize(`${t}…`, size) > max) t = t.slice(0, -1);
  return `${t}…`;
}

async function pdf(d: Data) {
  const doc = await PDFDocument.create();
  doc.setTitle(`Rapport fidélité ${d.program.merchantName}`);
  doc.setCreator("Qamar Réseaux");
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let page: PDFPage = doc.addPage([A4.w, A4.h]);
  let y = A4.h - M;
  const newPage = () => {
    page = doc.addPage([A4.w, A4.h]);
    y = A4.h - M;
  };
  const ensure = (h: number) => {
    if (y - h < M + 20) newPage();
  };
  const text = (s: string, x: number, size: number, f = font, color = ink) => page.drawText(safe(s), { x, y, size, font: f, color });

  // En-tête
  page.drawRectangle({ x: 0, y: A4.h - 6, width: A4.w, height: 6, color: orange });
  y -= 10;
  text("RAPPORT FIDÉLITÉ", M, 9, bold, orange);
  y -= 26;
  text(d.program.merchantName, M, 24, bold);
  y -= 18;
  text(`${d.days} derniers jours, au ${frDay(new Date().toISOString())} · ${d.program.name} · ${d.program.rewardLabel}`, M, 10, font, muted);
  y -= 28;

  // Chiffres clés (2 colonnes)
  const s = d.stats;
  const stamps = d.program.type === "stamps";
  const tiles: [string, string][] = [
    ["Passages", String(s.visits)],
    ["Clients venus", String(s.activeCustomers)],
    ["Nouveaux clients", String(s.newCustomers)],
    ["Récompenses utilisées", String(s.rewardsRedeemed)],
    ["Taux de retour", s.returningRate === null ? "—" : `${s.returningRate} %`],
    [stamps ? "Tampons donnés" : "Points donnés", String(stamps ? s.stampsGiven : s.pointsGiven)],
    ["Clients inscrits", String(s.customers)],
    ["À relancer", String(s.inactiveCustomers)],
  ];
  const colW = (A4.w - 2 * M - 12) / 4;
  for (let i = 0; i < tiles.length; i++) {
    const col = i % 4;
    if (col === 0 && i > 0) y -= 62;
    const x = M + col * (colW + 4);
    page.drawRectangle({ x, y: y - 52, width: colW - 4, height: 56, color: rgb(0.96, 0.95, 0.93) });
    page.drawText(safe(tiles[i][0].toUpperCase()), { x: x + 8, y: y - 10, size: 7, font: bold, color: muted });
    page.drawText(safe(tiles[i][1]), { x: x + 8, y: y - 38, size: 20, font: bold, color: ink });
  }
  y -= 80;
  if (s.estimatedRevenue !== null) {
    text(`Chiffre d'affaires estimé des passages : ${s.estimatedRevenue} € (passages × panier moyen)`, M, 10, font, muted);
    y -= 24;
  }

  // Tableaux
  const table = (title: string, header: string[], rows: (string | number)[][], widths: number[], empty: string) => {
    ensure(60);
    text(title, M, 13, bold);
    y -= 18;
    const total = widths.reduce((a, b) => a + b, 0);
    const scale = (A4.w - 2 * M) / total;
    const w = widths.map((x) => x * scale);
    const drawHeader = () => {
      page.drawRectangle({ x: M, y: y - 5, width: A4.w - 2 * M, height: 18, color: ink });
      let x = M + 4;
      header.forEach((h, i) => {
        page.drawText(fitText(h, bold, 7.5, w[i] - 6), { x, y: y + 1, size: 7.5, font: bold, color: rgb(1, 1, 1) });
        x += w[i];
      });
      y -= 18;
    };
    drawHeader();
    if (!rows.length) {
      text(empty, M + 4, 9, font, muted);
      y -= 24;
      return;
    }
    for (const r of rows) {
      if (y < M + 30) {
        newPage();
        drawHeader();
      }
      let x = M + 4;
      r.forEach((cell, i) => {
        page.drawText(fitText(String(cell), font, 8.5, w[i] - 6), { x, y, size: 8.5, font, color: ink });
        x += w[i];
      });
      page.drawLine({ start: { x: M, y: y - 5 }, end: { x: A4.w - M, y: y - 5 }, thickness: 0.5, color: line });
      y -= 16;
    }
    y -= 18;
  };

  const c = customerTable(d.program, d.customers);
  table(
    `Clients (${d.customers.length})`,
    ["Prénom", "E-mail", "Téléphone", stamps ? "Tampons" : "Points", "Récomp.", "Passages", "Dernier passage", "Inscrit le"],
    c.rows.map((r) => [r[0], r[1], r[2], r[5], r[6], r[8], r[9], r[10]] as (string | number)[]),
    [70, 130, 80, 45, 45, 45, 70, 60],
    "Aucun client inscrit pour le moment.",
  );
  const p = passageTable(d.passages);
  table(
    `Passages de la période (${d.passages.length})`,
    ["Date", "Heure", "Client", "Opération", "Vendeur"],
    p.rows.map((r) => [r[0], r[1], r[2], r[3], r[5]] as (string | number)[]),
    [60, 40, 90, 120, 100],
    "Aucun passage sur la période.",
  );

  // Pied de page sur chaque page
  const pages = doc.getPages();
  pages.forEach((pg, i) =>
    pg.drawText(safe(`Qamar Réseaux · ${d.program.merchantName} · page ${i + 1}/${pages.length}`), { x: M, y: 22, size: 7.5, font, color: muted }),
  );
  return Buffer.from(await doc.save());
}

// ——— Point d'entrée ———

export async function buildExport(staff: Staff, format: ExportFormat, dataset: ExportDataset, days: number) {
  const d = await exportData(staff, days);
  const day = parisDay(Date.now());
  if (format === "xlsx") {
    return { body: await xlsx(d), type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", filename: `fidelite-${day}.xlsx` };
  }
  if (format === "pdf") {
    return { body: await pdf(d), type: "application/pdf", filename: `rapport-fidelite-${day}.pdf` };
  }
  const t = dataset === "passages" ? passageTable(d.passages) : customerTable(d.program, d.customers);
  return { body: csv(t.header, t.rows), type: "text/csv; charset=utf-8", filename: `${dataset}-${day}.csv` };
}
