// Identité de la plateforme (à garder identique à "name" dans mobile/app.json).
export const BRAND = {
  name: "Qamar Réseaux",
  shortName: "Qamar",
  /** Société éditrice, affichée sur les cartes Wallet ("organizationName"). */
  company: "Qamar",
} as const;

/** Adresse de contact affichée sur les pages Aide et Confidentialité (variable CONTACT_EMAIL). */
export const contactEmail = () => process.env.CONTACT_EMAIL?.trim() || undefined;
