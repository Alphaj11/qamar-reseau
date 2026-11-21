// Test de la file hors ligne : node --test scripts/ledger.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { applySnapshot, applySyncResults, displayedCard, emptyLedger, recordOp } from "../src/lib/ledger.ts";
import type { Snapshot } from "../src/lib/types.ts";

const snap: Snapshot = {
  merchantName: "Café",
  serverTime: "2026-11-15T10:00:00.000Z",
  programs: [
    {
      id: "p1", name: "Carte", merchantName: "Café", type: "stamps", rewardLabel: "Café offert",
      stampsRequired: 10, pointsRequired: 100, pointsPerEuro: 1, bgColor: "#000", fgColor: "#fff", accentColor: "#fa0",
    },
  ],
  cards: [{ serial: "AAA", firstName: "Léa", programId: "p1", stamps: 8, points: 0, rewardsAvailable: 0, updatedAt: "x" }],
};

test("un passage hors ligne s'affiche tout de suite et débloque la récompense", () => {
  let l = applySnapshot(emptyLedger(), snap);
  l = recordOp(l, "AAA", "stamp", 1, "op1").ledger;
  l = recordOp(l, "AAA", "stamp", 1, "op2").ledger;
  const c = displayedCard(l, "AAA")!;
  assert.equal(c.stamps, 0);
  assert.equal(c.rewardsAvailable, 1);
  assert.equal(l.pending.length, 2);
});

test("récompense refusée s'il n'y en a pas", () => {
  const l = applySnapshot(emptyLedger(), snap);
  const r = recordOp(l, "AAA", "reward", 1, "op1");
  assert.equal(r.error, "Aucune récompense disponible");
  assert.equal(r.ledger.pending.length, 0);
});

test("la synchro garde les passages faits pendant l'envoi, sans double comptage", () => {
  let l = applySnapshot(emptyLedger(), snap);
  l = recordOp(l, "AAA", "stamp", 1, "op1").ledger; // 9
  const sent = [...l.pending];
  l = recordOp(l, "AAA", "stamp", 1, "op2").ledger; // enregistré pendant l'envoi
  l = applySyncResults(l, sent, [
    { clientOpId: "op1", status: "applied", card: { ...snap.cards[0], stamps: 9 } },
  ]);
  assert.deepEqual(l.pending.map((o) => o.clientOpId), ["op2"]);
  const c = displayedCard(l, "AAA")!;
  assert.equal(c.stamps, 0); // 9 confirmés + 1 en attente = 10 → récompense
  assert.equal(c.rewardsAvailable, 1);
});

test("un refus du serveur est signalé et retiré de la file", () => {
  let l = applySnapshot(emptyLedger(), snap);
  l = recordOp(l, "AAA", "stamp", 1, "op1").ledger;
  l = applySyncResults(l, [...l.pending], [{ clientOpId: "op1", status: "rejected", reason: "Carte inconnue" }]);
  assert.equal(l.pending.length, 0);
  assert.equal(l.rejected[0].reason, "Carte inconnue");
});

test("carte inconnue scannée hors ligne acceptée avec un seul programme", () => {
  let l = applySnapshot(emptyLedger(), snap);
  const r = recordOp(l, "NEW", "stamp", 1, "op1");
  assert.equal(r.error, undefined);
  l = r.ledger;
  assert.equal(displayedCard(l, "NEW")!.stamps, 1);
});
