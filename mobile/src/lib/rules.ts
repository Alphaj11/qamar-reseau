// Règle métier d'un passage. Copie exacte de applyRule dans web/src/lib/staff.ts :
// l'appli l'applique tout de suite (même hors ligne), le serveur la ré-applique à la synchro.
import type { CardView, OpKind, ProgramView } from "./types";

export type RuleResult = { ok: true; card: CardView } | { ok: false; reason: string };

export function applyRule(
  card: CardView,
  program: Pick<ProgramView, "type" | "stampsRequired" | "pointsRequired">,
  kind: OpKind,
  amount: number,
): RuleResult {
  const c = { ...card };
  if (kind === "reward") {
    if (c.rewardsAvailable < 1) return { ok: false, reason: "Aucune récompense disponible" };
    c.rewardsAvailable -= 1;
    return { ok: true, card: c };
  }
  if (!Number.isInteger(amount) || amount < 1 || amount > 10000) {
    return { ok: false, reason: "Quantité invalide" };
  }
  if (kind === "stamp") {
    if (program.type !== "stamps") return { ok: false, reason: "Ce programme fonctionne en points" };
    c.stamps += amount;
    while (c.stamps >= program.stampsRequired) {
      c.stamps -= program.stampsRequired;
      c.rewardsAvailable += 1;
    }
    return { ok: true, card: c };
  }
  if (program.type !== "points") return { ok: false, reason: "Ce programme fonctionne en tampons" };
  c.points += amount;
  while (c.points >= program.pointsRequired) {
    c.points -= program.pointsRequired;
    c.rewardsAvailable += 1;
  }
  return { ok: true, card: c };
}

/** Points gagnés pour un montant en euros (arrondi à l'inférieur). */
export function pointsForAmount(euros: number, pointsPerEuro: number) {
  return Math.floor(euros * pointsPerEuro + 1e-9);
}
