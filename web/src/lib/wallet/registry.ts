// Accès aux données utiles au service web PassKit et aux envois Wallet.
import "server-only";
import crypto from "crypto";
import { load, mutate } from "../db";
import type { Card, Customer, Program } from "../types";

export interface CardBundle {
  card: Card;
  program: Program;
  customer: Customer;
}

function bundle(db: Awaited<ReturnType<typeof load>>, card: Card | undefined): CardBundle | undefined {
  if (!card) return undefined;
  const program = db.programs.find((p) => p.id === card.programId);
  const customer = db.customers.find((c) => c.id === card.customerId);
  return program && customer ? { card, program, customer } : undefined;
}

export async function cardBySerial(serial: string) {
  const db = await load();
  return bundle(db, db.cards.find((c) => c.serial === serial));
}

export async function cardById(id: string) {
  const db = await load();
  return bundle(db, db.cards.find((c) => c.id === id));
}

export async function cardsBySerials(serials: string[]) {
  const db = await load();
  const set = new Set(serials);
  return db.cards.filter((c) => set.has(c.serial)).map((c) => bundle(db, c)).filter((b): b is CardBundle => !!b);
}

/** Compare un jeton sans fuite par mesure du temps. */
export function tokenMatches(expected: string, given: string | undefined) {
  if (!given) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Enregistre un iPhone pour une carte. Renvoie true si c'est un nouvel enregistrement. */
export function registerDevice(deviceLibraryId: string, serial: string, pushToken: string) {
  return mutate((db) => {
    const existing = db.appleRegistrations.find((r) => r.deviceLibraryId === deviceLibraryId && r.serial === serial);
    if (existing) {
      existing.pushToken = pushToken;
      return false;
    }
    db.appleRegistrations.push({ deviceLibraryId, serial, pushToken, createdAt: new Date().toISOString() });
    return true;
  });
}

export function unregisterDevice(deviceLibraryId: string, serial: string) {
  return mutate((db) => {
    db.appleRegistrations = db.appleRegistrations.filter(
      (r) => !(r.deviceLibraryId === deviceLibraryId && r.serial === serial),
    );
  });
}

export function removePushTokens(tokens: string[]) {
  const set = new Set(tokens);
  return mutate((db) => {
    db.appleRegistrations = db.appleRegistrations.filter((r) => !set.has(r.pushToken));
  });
}

/** Cartes d'un iPhone modifiées depuis une date (pour GET .../registrations). */
export async function serialsForDevice(deviceLibraryId: string, since?: string) {
  const db = await load();
  const serials = new Set(db.appleRegistrations.filter((r) => r.deviceLibraryId === deviceLibraryId).map((r) => r.serial));
  const cards = db.cards.filter((c) => serials.has(c.serial) && (!since || c.updatedAt > since));
  const lastUpdated = cards.reduce((max, c) => (c.updatedAt > max ? c.updatedAt : max), since ?? "");
  return { serials: cards.map((c) => c.serial), lastUpdated, registered: serials.size > 0 };
}

export async function pushTokensFor(serials: string[]) {
  const db = await load();
  const set = new Set(serials);
  return [...new Set(db.appleRegistrations.filter((r) => set.has(r.serial)).map((r) => r.pushToken))];
}

export function setGoogleObjectId(cardId: string, objectId: string) {
  return mutate((db) => {
    const card = db.cards.find((c) => c.id === cardId);
    if (card) card.googleObjectId = objectId;
  });
}
