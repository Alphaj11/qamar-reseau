// Identité de la plateforme (à garder identique à "name" dans mobile/app.json).
export const BRAND = {
  name: "Qamar Réseaux",
  shortName: "Qamar",
  /** Société éditrice, affichée sur les cartes Wallet ("organizationName"). */
  company: "Qamar",
} as const;

/** Adresse de contact affichée sur les pages Aide et Confidentialité (variable CONTACT_EMAIL). */
export const contactEmail = () => process.env.CONTACT_EMAIL?.trim() || undefined;

/**
 * Informations légales de la société éditrice (mentions légales, CGV). À renseigner chez l'hébergeur
 * (Render › Environment) : tant qu'une valeur manque, la page affiche « [à compléter] ».
 */
export function legalInfo() {
  const v = (name: string) => process.env[name]?.trim() || "[à compléter]";
  return {
    company: v("LEGAL_COMPANY"), // raison sociale, ex. « QAMAR SAS »
    form: v("LEGAL_FORM"), // forme et capital, ex. « SAS au capital de 1 000 € »
    siren: v("LEGAL_SIREN"), // RCS + numéro, ex. « RCS Paris 123 456 789 »
    vat: v("LEGAL_VAT"), // TVA intracommunautaire
    address: v("LEGAL_ADDRESS"), // adresse du siège
    director: v("LEGAL_DIRECTOR"), // directeur de la publication (le représentant légal)
    city: v("LEGAL_COURT_CITY"), // ville du tribunal de commerce compétent
    email: contactEmail() ?? "[à compléter]",
  };
}
