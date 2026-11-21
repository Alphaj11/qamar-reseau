// Configuration Apple Wallet / Google Wallet, lue dans les variables d'environnement (.env.local).
// Tant qu'un côté n'est pas configuré, ses boutons restent désactivés et ses envois sont ignorés.
import "server-only";
import { readFileSync } from "fs";
import path from "path";

/** Adresse publique du site (https en production) : utilisée dans les cartes pour les mises à jour. */
export function publicUrl() {
  return (process.env.PUBLIC_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

function readMaybeFile(value: string | undefined): string | undefined {
  if (!value) return undefined;
  // Valeur directe (PEM collé) ou chemin vers un fichier
  if (value.includes("-----BEGIN") || value.trim().startsWith("{")) return value;
  try {
    return readFileSync(path.resolve(process.cwd(), value), "utf8");
  } catch {
    return undefined;
  }
}

export interface AppleConfig {
  passTypeId: string; // ex. pass.com.qamar.fidelite
  teamId: string; // identifiant d'équipe Apple Developer (10 caractères)
  signerCert: string; // certificat "Pass Type ID" (PEM)
  signerKey: string; // clé privée associée (PEM)
  signerKeyPassphrase?: string;
  wwdr: string; // certificat intermédiaire Apple WWDR G4 (PEM)
  /** false en local : n'envoie pas réellement de notifications APNs. */
  pushEnabled: boolean;
}

export function appleConfig(): AppleConfig | undefined {
  const passTypeId = process.env.APPLE_PASS_TYPE_ID;
  const teamId = process.env.APPLE_TEAM_ID;
  const signerCert = readMaybeFile(process.env.APPLE_PASS_CERT);
  const signerKey = readMaybeFile(process.env.APPLE_PASS_KEY);
  const wwdr = readMaybeFile(process.env.APPLE_WWDR_CERT);
  if (!passTypeId || !teamId || !signerCert || !signerKey || !wwdr) return undefined;
  return {
    passTypeId,
    teamId,
    signerCert,
    signerKey,
    signerKeyPassphrase: process.env.APPLE_PASS_KEY_PASSPHRASE || undefined,
    wwdr,
    pushEnabled: process.env.APPLE_PUSH_ENABLED !== "false",
  };
}

export interface GoogleConfig {
  issuerId: string; // identifiant émetteur Google Pay & Wallet Console
  clientEmail: string; // compte de service Google Cloud
  privateKey: string;
  /** false en local : n'appelle pas l'API Google. */
  apiEnabled: boolean;
}

export function googleConfig(): GoogleConfig | undefined {
  const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID;
  const raw = readMaybeFile(process.env.GOOGLE_SERVICE_ACCOUNT);
  if (!issuerId || !raw) return undefined;
  try {
    const sa = JSON.parse(raw) as { client_email?: string; private_key?: string };
    if (!sa.client_email || !sa.private_key) return undefined;
    return {
      issuerId,
      clientEmail: sa.client_email,
      privateKey: sa.private_key,
      apiEnabled: process.env.GOOGLE_WALLET_API_ENABLED !== "false",
    };
  } catch {
    return undefined;
  }
}

export const walletStatus = () => ({ apple: !!appleConfig(), google: !!googleConfig() });
