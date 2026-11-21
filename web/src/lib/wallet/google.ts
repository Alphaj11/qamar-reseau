// Cartes Google Wallet (type "Loyalty"). Doc : https://developers.google.com/wallet/retail/loyalty-cards
// - Ajout : lien "Ajouter à Google Wallet" = JWT signé contenant la classe et l'objet de la carte.
// - Mise à jour : PATCH de l'objet via l'API REST (Google rafraîchit la carte sur le téléphone).
// - Message push : addMessage avec TEXT_AND_NOTIFY (Google limite à 3 notifications / 24 h / carte).
import "server-only";
import crypto from "crypto";
import type { Card, Customer, Program } from "../types";
import { publicUrl, type GoogleConfig } from "./config";
import { cardContent } from "./content";

const API = "https://walletobjects.googleapis.com/walletobjects/v1";

const b64url = (data: string | Buffer) => Buffer.from(data).toString("base64url");

/** Signe un JWT RS256 avec la clé du compte de service. */
export function signJwt(payload: object, privateKey: string) {
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const body = b64url(JSON.stringify(payload));
  const signature = crypto.sign("RSA-SHA256", Buffer.from(`${header}.${body}`), privateKey);
  return `${header}.${body}.${b64url(signature)}`;
}

const safeId = (s: string) => s.replace(/[^A-Za-z0-9._-]/g, "_");
export const googleClassId = (cfg: GoogleConfig, program: Program) => `${cfg.issuerId}.${safeId(program.id)}`;
export const googleObjectId = (cfg: GoogleConfig, card: Card) => `${cfg.issuerId}.${safeId(card.serial)}`;

export function loyaltyClass(cfg: GoogleConfig, program: Program) {
  return {
    id: googleClassId(cfg, program),
    issuerName: program.merchantName,
    programName: program.name,
    programLogo: {
      sourceUri: { uri: `${publicUrl()}/api/wallet/google/logo/${program.slug}` },
      contentDescription: { defaultValue: { language: "fr-FR", value: program.merchantName } },
    },
    hexBackgroundColor: program.bgColor,
    reviewStatus: "UNDER_REVIEW",
    multipleDevicesAndHoldersAllowedStatus: "ONE_USER_ALL_DEVICES",
    // Boutiques (max 10) : Google affiche une notification quand le client passe à proximité.
    // Google choisit le rayon, la durée de présence et le texte ; le client peut les désactiver.
    ...(program.locations?.length
      ? { merchantLocations: program.locations.slice(0, 10).map((l) => ({ latitude: l.latitude, longitude: l.longitude })) }
      : {}),
  };
}

export function loyaltyObject(cfg: GoogleConfig, card: Card, program: Program, customer: Customer) {
  const c = cardContent(card, program, customer);
  return {
    id: googleObjectId(cfg, card),
    classId: googleClassId(cfg, program),
    state: "ACTIVE",
    accountId: card.serial,
    accountName: c.member,
    loyaltyPoints: { label: c.balanceLabel, balance: { string: c.balanceValue } },
    barcode: { type: "QR_CODE", value: card.serial, alternateText: card.serial },
    heroImage: {
      sourceUri: { uri: `${publicUrl()}/api/strip/${program.slug}?value=${c.progressValue}&format=google` },
      contentDescription: { defaultValue: { language: "fr-FR", value: `${c.balanceLabel} ${c.balanceValue}` } },
    },
    textModulesData: [
      { id: "reward", header: "Récompense", body: `${c.rewardLabel} · ${c.rewardsAvailable}` },
      ...(c.terms ? [{ id: "terms", header: "Conditions", body: c.terms }] : []),
    ],
    ...(c.reviewUrl ? { linksModuleData: { uris: [{ id: "review", uri: c.reviewUrl, description: "Laisser un avis sur Google" }] } } : {}),
  };
}

/** Lien "Ajouter à Google Wallet" (crée la classe et la carte au premier ajout). */
export function googleSaveUrl(cfg: GoogleConfig, card: Card, program: Program, customer: Customer) {
  const jwt = signJwt(
    {
      iss: cfg.clientEmail,
      aud: "google",
      typ: "savetowallet",
      iat: Math.floor(Date.now() / 1000),
      origins: [publicUrl()],
      payload: {
        loyaltyClasses: [loyaltyClass(cfg, program)],
        loyaltyObjects: [loyaltyObject(cfg, card, program, customer)],
      },
    },
    cfg.privateKey,
  );
  return `https://pay.google.com/gp/v/save/${jwt}`;
}

// ——— API REST ———

let cachedToken: { value: string; expiresAt: number } | undefined;

/** Jeton d'accès OAuth du compte de service (mis en cache ~55 min). */
async function accessToken(cfg: GoogleConfig) {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;
  const now = Math.floor(Date.now() / 1000);
  const assertion = signJwt(
    {
      iss: cfg.clientEmail,
      scope: "https://www.googleapis.com/auth/wallet_object.issuer",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    },
    cfg.privateKey,
  );
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  if (!res.ok) throw new Error(`Google OAuth ${res.status}`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: json.access_token, expiresAt: Date.now() + (json.expires_in - 300) * 1000 };
  return json.access_token;
}

async function call(cfg: GoogleConfig, method: string, path: string, body?: unknown) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${await accessToken(cfg)}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res;
}

/** Met à jour la carte côté Google. 404 = le client ne l'a pas (encore) ajoutée : on ignore. */
export async function updateGoogleObject(cfg: GoogleConfig, card: Card, program: Program, customer: Customer) {
  if (!cfg.apiEnabled) return "skipped" as const;
  const obj = loyaltyObject(cfg, card, program, customer);
  const res = await call(cfg, "PATCH", `/loyaltyObject/${encodeURIComponent(obj.id)}`, obj);
  if (res.status === 404) return "absent" as const;
  if (!res.ok) throw new Error(`Google Wallet PATCH ${res.status}`);
  return "updated" as const;
}

/** Met à jour la classe (nom, couleurs, boutiques) : s'applique à toutes les cartes du programme. */
export async function updateGoogleClass(cfg: GoogleConfig, program: Program) {
  if (!cfg.apiEnabled) return "skipped" as const;
  const cls = loyaltyClass(cfg, program);
  const { reviewStatus: _ignored, ...patch } = cls;
  void _ignored;
  const res = await call(cfg, "PATCH", `/loyaltyClass/${encodeURIComponent(cls.id)}`, patch);
  // 404 : aucun client n'a encore ajouté la carte, la classe sera créée au premier ajout
  if (res.status === 404) return "absent" as const;
  if (!res.ok) throw new Error(`Google Wallet PATCH classe ${res.status}`);
  return "updated" as const;
}

/** Envoie un message avec notification sur la carte Google. */
export async function sendGoogleMessage(cfg: GoogleConfig, card: Card, header: string, body: string) {
  if (!cfg.apiEnabled) return "skipped" as const;
  const id = googleObjectId(cfg, card);
  const res = await call(cfg, "POST", `/loyaltyObject/${encodeURIComponent(id)}/addMessage`, {
    message: { id: `msg-${Date.now()}`, header, body, messageType: "TEXT_AND_NOTIFY" },
  });
  if (res.status === 404) return "absent" as const;
  if (!res.ok) throw new Error(`Google Wallet addMessage ${res.status}`);
  return "sent" as const;
}
