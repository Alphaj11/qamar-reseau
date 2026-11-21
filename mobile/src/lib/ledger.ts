// État local de la caisse, sans dépendance à React ni au réseau (testable seul).
//
// Principe : on garde la dernière version des cartes connue du serveur ("confirmed")
// et la liste des passages pas encore confirmés ("pending"). La carte affichée =
// version serveur + passages en attente rejoués par-dessus. Ainsi, un passage hors
// ligne s'affiche tout de suite et rien n'est perdu ni compté deux fois.
import { applyRule } from "./rules";
import type { CardView, OpKind, PendingOp, ProgramView, Snapshot, SyncResult } from "./types";

export interface Ledger {
  merchantName: string;
  programs: ProgramView[];
  confirmed: Record<string, CardView>; // par numéro de série
  pending: PendingOp[];
  /** Passages refusés par le serveur à la synchro, à montrer au vendeur. */
  rejected: { op: PendingOp; reason: string }[];
  lastSyncAt?: string;
}

export const emptyLedger = (): Ledger => ({
  merchantName: "",
  programs: [],
  confirmed: {},
  pending: [],
  rejected: [],
});

export function programOf(ledger: Ledger, card: CardView) {
  return ledger.programs.find((p) => p.id === card.programId);
}

/** Carte vue par le vendeur : version serveur + passages en attente. */
export function displayedCard(ledger: Ledger, serial: string): CardView | undefined {
  let card = ledger.confirmed[serial];
  if (!card) {
    // Carte créée depuis la dernière synchro, scannée hors ligne : on part de zéro
    // (possible seulement si le commerçant n'a qu'un programme).
    if (!ledger.pending.some((o) => o.serial === serial) || ledger.programs.length !== 1) return undefined;
    card = unknownCard(ledger, serial);
  }
  const program = programOf(ledger, card);
  if (!program) return card;
  for (const op of ledger.pending) {
    if (op.serial !== serial) continue;
    const r = applyRule(card, program, op.kind, op.amount);
    if (r.ok) card = r.card;
  }
  return card;
}

export function unknownCard(ledger: Ledger, serial: string): CardView {
  return {
    serial,
    firstName: "Nouveau client",
    programId: ledger.programs[0].id,
    stamps: 0,
    points: 0,
    rewardsAvailable: 0,
    updatedAt: new Date(0).toISOString(),
  };
}

/** Prépare une carte inconnue scannée hors ligne (un seul programme). */
export function canUseUnknownCard(ledger: Ledger) {
  return ledger.programs.length === 1;
}

/**
 * Enregistre un passage. Vérifie la règle sur la carte affichée (ex. pas de
 * récompense si aucune n'est disponible) avant de l'ajouter à la file.
 */
export function recordOp(
  ledger: Ledger,
  serial: string,
  kind: OpKind,
  amount: number,
  clientOpId: string,
  now = new Date(),
): { ledger: Ledger; error?: string } {
  const card =
    displayedCard(ledger, serial) ?? (canUseUnknownCard(ledger) ? unknownCard(ledger, serial) : undefined);
  if (!card) return { ledger, error: "Carte inconnue" };
  const program = programOf(ledger, card);
  if (!program) return { ledger, error: "Programme introuvable" };
  const r = applyRule(card, program, kind, kind === "reward" ? 1 : amount);
  if (!r.ok) return { ledger, error: r.reason };
  const op: PendingOp = { clientOpId, serial, kind, amount: kind === "reward" ? 1 : amount, occurredAt: now.toISOString() };
  return { ledger: { ...ledger, pending: [...ledger.pending, op] } };
}

/** Intègre la réponse du serveur pour les passages envoyés. */
export function applySyncResults(ledger: Ledger, sent: PendingOp[], results: SyncResult[], now = new Date()): Ledger {
  const done = new Set(results.map((r) => r.clientOpId));
  const confirmed = { ...ledger.confirmed };
  const rejected = [...ledger.rejected];
  for (const r of results) {
    if (r.card) confirmed[r.card.serial] = r.card;
    if (r.status === "rejected") {
      const op = sent.find((o) => o.clientOpId === r.clientOpId);
      if (op) rejected.push({ op, reason: r.reason });
    }
  }
  return {
    ...ledger,
    confirmed,
    rejected: rejected.slice(-20),
    // Les passages enregistrés pendant l'envoi restent dans la file
    pending: ledger.pending.filter((o) => !done.has(o.clientOpId)),
    lastSyncAt: now.toISOString(),
  };
}

/** Remplace le cache par les données fraîches du serveur, sans toucher à la file. */
export function applySnapshot(ledger: Ledger, snap: Snapshot): Ledger {
  const confirmed: Record<string, CardView> = {};
  for (const c of snap.cards) confirmed[c.serial] = c;
  return { ...ledger, merchantName: snap.merchantName, programs: snap.programs, confirmed, lastSyncAt: snap.serverTime };
}

export function upsertCard(ledger: Ledger, card: CardView): Ledger {
  return { ...ledger, confirmed: { ...ledger.confirmed, [card.serial]: card } };
}
