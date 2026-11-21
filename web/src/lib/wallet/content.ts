// Contenu texte commun aux cartes Apple et Google : une seule source de vérité.
import { reviewUrlFor } from "../review";
import type { Card, Customer, Program } from "../types";

export interface CardContent {
  balanceLabel: string; // "Tampons" | "Points"
  balanceValue: string; // "6/10" | "120 pts"
  progressValue: number; // nombre utilisé pour l'image de la bannière
  rewardLabel: string;
  rewardsAvailable: string; // "1 récompense disponible" | "Encore 4 tampons"
  member: string;
  message?: string;
  terms?: string;
  /** Lien d'avis Google affiché au dos de la carte. */
  reviewUrl?: string;
}

export function cardContent(card: Card, program: Program, customer: Customer): CardContent {
  const stamps = program.type === "stamps";
  const goal = stamps ? program.stampsRequired : program.pointsRequired;
  const value = stamps ? card.stamps : card.points;
  const remaining = goal - value;
  const unit = stamps ? "tampon" : "point";
  return {
    balanceLabel: stamps ? "Tampons" : "Points",
    balanceValue: stamps ? `${value}/${goal}` : `${value} pts`,
    progressValue: value,
    rewardLabel: program.rewardLabel,
    rewardsAvailable:
      card.rewardsAvailable > 0
        ? `${card.rewardsAvailable} récompense${card.rewardsAvailable > 1 ? "s" : ""} disponible${card.rewardsAvailable > 1 ? "s" : ""}`
        : `Encore ${remaining} ${unit}${remaining > 1 ? "s" : ""}`,
    member: customer.firstName,
    message: card.lastMessage,
    terms: program.terms,
    reviewUrl: reviewUrlFor(program),
  };
}

/** Convertit #rrggbb en rgb(r, g, b), format exigé par Apple. */
export function hexToRgb(hex: string) {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return "rgb(0, 0, 0)";
  return `rgb(${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)})`;
}
