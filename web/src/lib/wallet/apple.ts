// Génération de la carte Apple Wallet (.pkpass) d'un client.
// Doc Apple : https://developer.apple.com/documentation/walletpasses
import "server-only";
import { PKPass } from "passkit-generator";
import { BRAND } from "../brand";
import type { Card, Customer, Program } from "../types";
import { appleConfig, publicUrl } from "./config";
import { cardContent, hexToRgb } from "./content";
import { applePassImages } from "./images";

export const PKPASS_MIME = "application/vnd.apple.pkpass";

/** Construit le pass.json (exporté pour les tests). */
export function applePassJson(card: Card, program: Program, customer: Customer, passTypeId: string, teamId: string) {
  const c = cardContent(card, program, customer);
  return {
    formatVersion: 1,
    passTypeIdentifier: passTypeId,
    teamIdentifier: teamId,
    serialNumber: card.serial,
    // Service web : l'iPhone s'y enregistre et y récupère les mises à jour de la carte
    webServiceURL: `${publicUrl()}/api/passkit`,
    authenticationToken: card.authToken,
    organizationName: BRAND.company,
    description: `Carte de fidélité ${program.merchantName}`,
    logoText: program.merchantName,
    backgroundColor: hexToRgb(program.bgColor),
    foregroundColor: hexToRgb(program.fgColor),
    labelColor: hexToRgb(program.labelColor ?? program.fgColor),
    sharingProhibited: true,
    barcodes: [{ format: "PKBarcodeFormatQR", message: card.serial, messageEncoding: "iso-8859-1", altText: card.serial }],
    // Boutiques : la carte apparaît sur l'écran verrouillé à proximité (iPhone décide du rayon)
    ...(program.locations?.length
      ? {
          locations: program.locations.slice(0, 10).map((l) => ({
            latitude: l.latitude,
            longitude: l.longitude,
            relevantText: l.relevantText ?? `${program.merchantName} est tout près`,
          })),
        }
      : {}),
    storeCard: {
      headerFields: [
        // changeMessage : notification affichée quand la valeur change (%@ = nouvelle valeur)
        { key: "balance", label: c.balanceLabel, value: c.balanceValue, changeMessage: `${c.balanceLabel} : %@` },
      ],
      secondaryFields: [
        { key: "reward", label: "Récompense", value: c.rewardLabel },
        { key: "status", label: "Statut", value: c.rewardsAvailable, changeMessage: "%@" },
      ],
      auxiliaryFields: [{ key: "member", label: "Membre", value: c.member }],
      backFields: [
        // Champ des messages push : chaque nouveau message déclenche une notification
        { key: "message", label: "Message de la boutique", value: c.message ?? "Aucun message pour le moment.", changeMessage: "%@" },
        ...(c.reviewUrl
          ? [{ key: "review", label: "Votre avis compte", value: c.reviewUrl, attributedValue: `<a href="${c.reviewUrl}">Laisser un avis sur Google</a>` }]
          : []),
        ...(c.terms ? [{ key: "terms", label: "Conditions", value: c.terms }] : []),
        { key: "brand", label: "Carte proposée par", value: BRAND.name },
      ],
    },
  };
}

/** Génère le fichier .pkpass signé. Renvoie undefined si Apple n'est pas configuré. */
export async function buildApplePass(card: Card, program: Program, customer: Customer): Promise<Buffer | undefined> {
  const cfg = appleConfig();
  if (!cfg) return undefined;
  const json = applePassJson(card, program, customer, cfg.passTypeId, cfg.teamId);
  const images = await applePassImages(program, cardContent(card, program, customer).progressValue);
  const pass = new PKPass(
    { "pass.json": Buffer.from(JSON.stringify(json)), ...images },
    {
      wwdr: cfg.wwdr,
      signerCert: cfg.signerCert,
      signerKey: cfg.signerKey,
      signerKeyPassphrase: cfg.signerKeyPassphrase,
    },
  );
  return pass.getAsBuffer();
}
