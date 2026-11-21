// Studio de carte : pictogrammes de tampons et modèles par métier.
// ⚠ Fichier identique dans web/src/lib/card-design.ts et mobile/src/lib/card-design.ts : modifier les deux.
// Les pictogrammes sont dessinés dans un carré 24 × 24, couleur = currentColor ;
// les détails « en creux » utilisent du noir semi-transparent pour rester lisibles sur toutes les couleurs.

const D = 'fill="#000" fill-opacity=".28"'; // détail en creux
const L = 'fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"';

export const STAMP_ICONS = {
  baguette: {
    label: "Baguette",
    svg: `<g transform="rotate(-38 12 12)"><rect x="1.5" y="8.6" width="21" height="6.8" rx="3.4" fill="currentColor"/><path d="M6.6 10l1.8 4M10.9 10l1.8 4M15.2 10l1.8 4" stroke="#000" stroke-opacity=".3" stroke-width="1.3" stroke-linecap="round"/></g>`,
  },
  croissant: {
    label: "Croissant",
    svg: `<path d="M2.5 15.5C4 9.5 8 6 12 6s8 3.5 9.5 9.5c-1.8 1-3.7 1-5 .1C15.6 12.6 14 10.6 12 10.6s-3.6 2-4.5 5c-1.3.9-3.2.9-5-.1z" fill="currentColor"/><path d="M9.3 8.3l1.3 2.6M14.7 8.3l-1.3 2.6" stroke="#000" stroke-opacity=".28" stroke-width="1.2" stroke-linecap="round"/>`,
  },
  cake: {
    label: "Gâteau",
    svg: `<rect x="4" y="12" width="16" height="8.5" rx="1.6" fill="currentColor"/><path d="M4 15c1.3 1.2 2.7 1.2 4 0s2.7-1.2 4 0 2.7 1.2 4 0 2.7-1.2 4 0" stroke="#000" stroke-opacity=".25" stroke-width="1.3" fill="none"/><rect x="11" y="6.5" width="2" height="4.5" rx="1" fill="currentColor"/><path d="M12 2.5c1.4 1.4 1.4 2.7 0 3.4-1.4-.7-1.4-2 0-3.4z" fill="currentColor"/>`,
  },
  candy: {
    label: "Bonbon",
    svg: `<rect x="7.5" y="8" width="9" height="8" rx="3.5" fill="currentColor"/><path d="M7.6 12L3 8.3v7.4zM16.4 12L21 8.3v7.4z" fill="currentColor"/><path d="M10 9.5l-1.2 5M13.5 9.5l-1.2 5" stroke="#000" stroke-opacity=".22" stroke-width="1.2"/>`,
  },
  coffee: {
    label: "Tasse",
    svg: `<path d="M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9z" fill="currentColor"/><path d="M16 10.5h1.5a2.5 2.5 0 0 1 0 5H16" ${L} stroke-width="1.8"/><path d="M8 3.5c-.8 1 .8 1.8 0 3M12 3.5c-.8 1 .8 1.8 0 3" ${L} stroke-width="1.4"/>`,
  },
  cutlery: {
    label: "Couverts",
    svg: `<path d="M7 3v6.5a2 2 0 0 0 2 2V21M5 3v5.5M9 3v5.5" ${L} stroke-width="1.9"/><path d="M17.5 21V3c-2.6 1.4-3.8 4.2-3.8 8.5h3.8" fill="currentColor"/><path d="M17.5 11.5V21" ${L} stroke-width="1.9"/>`,
  },
  pizza: {
    label: "Pizza",
    svg: `<path d="M12 21.5L3.2 6.6c5.3-3.5 12.3-3.5 17.6 0z" fill="currentColor"/><path d="M4.7 8.9c4.3-2.6 10.3-2.6 14.6 0" stroke="#000" stroke-opacity=".22" stroke-width="1.3" fill="none"/><circle cx="10" cy="11" r="1.5" ${D}/><circle cx="14.2" cy="12.6" r="1.4" ${D}/><circle cx="11.8" cy="16" r="1.2" ${D}/>`,
  },
  burger: {
    label: "Burger",
    svg: `<path d="M3.5 10.5a8.5 6.5 0 0 1 17 0z" fill="currentColor"/><rect x="2.5" y="12" width="19" height="2.6" rx="1.3" fill="currentColor"/><path d="M3.5 16.2h17v1.3a3 3 0 0 1-3 3h-11a3 3 0 0 1-3-3z" fill="currentColor"/><circle cx="9" cy="7.6" r=".7" ${D}/><circle cx="12.5" cy="6.6" r=".7" ${D}/><circle cx="15.5" cy="8" r=".7" ${D}/>`,
  },
  sushi: {
    label: "Sushi",
    svg: `<ellipse cx="12" cy="12" rx="9.5" ry="7.5" fill="currentColor"/><ellipse cx="12" cy="11.2" rx="6" ry="4.4" ${D}/><ellipse cx="12" cy="11.2" rx="2.6" ry="1.9" fill="currentColor"/>`,
  },
  bowl: {
    label: "Bol",
    svg: `<path d="M2.5 11h19a9.5 9.5 0 0 1-19 0z" fill="currentColor"/><path d="M8 8.2c-.9-1.2.9-2.2 0-3.6M12 8.2c-.9-1.2.9-2.2 0-3.6M16 8.2c-.9-1.2.9-2.2 0-3.6" ${L} stroke-width="1.5"/>`,
  },
  beer: {
    label: "Bière",
    svg: `<rect x="4.5" y="7" width="11.5" height="14" rx="2" fill="currentColor"/><path d="M16 9.5h2a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" ${L} stroke-width="2"/><path d="M4.5 8.5c-.4-2.3 1.4-4.3 3.6-4 1.2-1.4 3.6-1.4 4.8 0 2.2-.3 3.6 1.7 3.1 4z" fill="currentColor"/><path d="M8 11v7M12.5 11v7" stroke="#000" stroke-opacity=".22" stroke-width="1.4" stroke-linecap="round"/>`,
  },
  wine: {
    label: "Verre",
    svg: `<path d="M6.8 2.8h10.4c.2 5.4-1.6 9-5.2 9s-5.4-3.6-5.2-9z" fill="currentColor"/><path d="M12 11.8v7.4M8.4 20.6h7.2" ${L} stroke-width="2"/>`,
  },
  meat: {
    label: "Viande",
    svg: `<path d="M4.6 9.2C4.4 5.4 8.6 3.4 12.8 3.8c4.7.5 7.4 3.7 6.8 7.9-.4 3.4-3 4.7-4.7 6.8-1.9 2.3-4.4 3.9-7 2.3-2.3-1.4-1.3-4.3-2.4-6.2-.7-1.4-.8-3.2-.9-5.4z" fill="currentColor"/><circle cx="14" cy="9.6" r="2.2" ${D}/><path d="M7.5 9.5c1.2 1.6 1 3.4 2.5 4.8" stroke="#000" stroke-opacity=".2" stroke-width="1.2" fill="none" stroke-linecap="round"/>`,
  },
  fish: {
    label: "Poisson",
    svg: `<path d="M2.5 12c3-4.6 9.2-6.2 14.2-2.6L21.5 6v12l-4.8-3.4C11.7 18.2 5.5 16.6 2.5 12z" fill="currentColor"/><circle cx="7.2" cy="11.2" r="1.2" ${D}/><path d="M11 9.5c.8 1.6.8 3.4 0 5" stroke="#000" stroke-opacity=".22" stroke-width="1.2" fill="none" stroke-linecap="round"/>`,
  },
  cheese: {
    label: "Fromage",
    svg: `<path d="M2.5 11.5L16.5 4l5 7.5z" fill="currentColor"/><path d="M2.5 12.5h19v7.5h-19z" fill="currentColor"/><circle cx="7" cy="16" r="1.6" ${D}/><circle cx="13.5" cy="15" r="1.2" ${D}/><circle cx="17.5" cy="17.6" r="1.4" ${D}/><circle cx="14" cy="8.6" r="1" ${D}/>`,
  },
  apple: {
    label: "Fruit",
    svg: `<path d="M12 7.6c-2.1-1.6-7.3-1.4-7.3 4.6 0 4.2 3 9.1 5.1 9.1 1 0 1.4-.6 2.2-.6s1.2.6 2.2.6c2.1 0 5.1-4.9 5.1-9.1 0-6-5.2-6.2-7.3-4.6z" fill="currentColor"/><path d="M12 7.6c0-2.1 1-3.6 3.2-4.6" ${L} stroke-width="1.7"/><path d="M12.4 5.4c1.8-1.8 4.3-1.6 5.2-.9-1 1.4-3.2 2-5.2.9z" fill="currentColor"/>`,
  },
  icecream: {
    label: "Glace",
    svg: `<path d="M7.6 11.2h8.8L12 22z" fill="currentColor"/><path d="M9.5 13l3.8 4.2M14.2 13L10.8 17" stroke="#000" stroke-opacity=".22" stroke-width="1.1"/><circle cx="12" cy="7.8" r="4.8" fill="currentColor"/>`,
  },
  scissors: {
    label: "Ciseaux",
    svg: `<circle cx="6.5" cy="17.5" r="3" ${L} stroke-width="2.2"/><circle cx="17.5" cy="17.5" r="3" ${L} stroke-width="2.2"/><path d="M8.6 15.4L18.5 3M15.4 15.4L5.5 3" ${L} stroke-width="2.3"/>`,
  },
  sparkle: {
    label: "Éclat",
    svg: `<path d="M11 2.5l2.1 7.4 7.4 2.1-7.4 2.1L11 21.5l-2.1-7.4L1.5 12l7.4-2.1z" fill="currentColor"/><path d="M19 2.5l.8 2.7 2.7.8-2.7.8-.8 2.7-.8-2.7-2.7-.8 2.7-.8z" fill="currentColor"/>`,
  },
  nail: {
    label: "Vernis",
    svg: `<rect x="9.4" y="2.3" width="5.2" height="8.2" rx="1.3" fill="currentColor"/><path d="M7 11.3h10a1.6 1.6 0 0 1 1.6 1.6v6.6a2.2 2.2 0 0 1-2.2 2.2H7.6a2.2 2.2 0 0 1-2.2-2.2v-6.6A1.6 1.6 0 0 1 7 11.3z" fill="currentColor"/><path d="M8.2 14v4.4" stroke="#000" stroke-opacity=".22" stroke-width="1.4" stroke-linecap="round"/>`,
  },
  flower: {
    label: "Fleur",
    svg: `<circle cx="12" cy="6.4" r="3.4" fill="currentColor"/><circle cx="17.3" cy="10.3" r="3.4" fill="currentColor"/><circle cx="15.3" cy="16.5" r="3.4" fill="currentColor"/><circle cx="8.7" cy="16.5" r="3.4" fill="currentColor"/><circle cx="6.7" cy="10.3" r="3.4" fill="currentColor"/><circle cx="12" cy="11.8" r="2.5" ${D}/>`,
  },
  leaf: {
    label: "Feuille",
    svg: `<path d="M20.5 3.5C9.5 3.5 4 8.5 4 15.5c0 1.6.3 3 .9 4.3C6.3 13.8 10.3 9.8 15.5 7.6 11.3 10.8 8.2 15 6.7 20.6c1.4.6 2.9.9 4.4.9 6.2 0 9.4-6.2 9.4-18z" fill="currentColor"/>`,
  },
  book: {
    label: "Livre",
    svg: `<path d="M3.5 4.5h6.3a2.2 2.2 0 0 1 2.2 2.2V20.5a1.6 1.6 0 0 0-1.6-1.6H3.5z" fill="currentColor"/><path d="M20.5 4.5h-6.3A2.2 2.2 0 0 0 12 6.7V20.5a1.6 1.6 0 0 1 1.6-1.6h6.9z" fill="currentColor"/><path d="M6 8.5h3.5M6 11.5h3.5M14.5 8.5H18M14.5 11.5H18" stroke="#000" stroke-opacity=".22" stroke-width="1.2" stroke-linecap="round"/>`,
  },
  shirt: {
    label: "Vêtement",
    svg: `<path d="M8.6 3.3L4 5.8l-2.2 5.1 3.3 1.4 1.3-2.3v11.2h11.2V10l1.3 2.3 3.3-1.4L20 5.8l-4.6-2.5C14.9 4.8 13.6 5.8 12 5.8S9.1 4.8 8.6 3.3z" fill="currentColor"/>`,
  },
  dumbbell: {
    label: "Haltère",
    svg: `<rect x="1.5" y="9" width="3" height="6" rx="1" fill="currentColor"/><rect x="4.8" y="6" width="3.4" height="12" rx="1.2" fill="currentColor"/><rect x="15.8" y="6" width="3.4" height="12" rx="1.2" fill="currentColor"/><rect x="19.5" y="9" width="3" height="6" rx="1" fill="currentColor"/><rect x="8" y="10.8" width="8" height="2.4" fill="currentColor"/>`,
  },
  paw: {
    label: "Patte",
    svg: `<ellipse cx="6" cy="10" rx="2.1" ry="2.7" fill="currentColor"/><ellipse cx="9.7" cy="6" rx="2.1" ry="2.8" fill="currentColor"/><ellipse cx="14.3" cy="6" rx="2.1" ry="2.8" fill="currentColor"/><ellipse cx="18" cy="10" rx="2.1" ry="2.7" fill="currentColor"/><path d="M12 11.5c-3.2 0-6 3.9-6 6.6 0 1.9 1.5 2.6 3 2.6 1.3 0 2-.7 3-.7s1.7.7 3 .7c1.5 0 3-.7 3-2.6 0-2.7-2.8-6.6-6-6.6z" fill="currentColor"/>`,
  },
  car: {
    label: "Voiture",
    svg: `<path d="M5 11.5l2-5.2h10l2 5.2" ${L} stroke-width="2"/><rect x="2.5" y="11" width="19" height="6.6" rx="2.2" fill="currentColor"/><circle cx="7.2" cy="18" r="2.3" fill="currentColor"/><circle cx="16.8" cy="18" r="2.3" fill="currentColor"/><path d="M5.5 14h2M16.5 14h2" stroke="#000" stroke-opacity=".3" stroke-width="1.5" stroke-linecap="round"/>`,
  },
  gift: {
    label: "Cadeau",
    svg: `<rect x="3" y="8.8" width="18" height="4.2" rx="1" fill="currentColor"/><rect x="4.6" y="13" width="14.8" height="8" rx="1" fill="currentColor"/><path d="M12 8.8V21" stroke="#000" stroke-opacity=".28" stroke-width="1.7"/><path d="M12 8.8C10 4.6 6.4 4.8 6.4 7s3.6 1.8 5.6 1.8zm0 0c2-4.2 5.6-4 5.6-1.8S14 8.8 12 8.8z" fill="currentColor"/>`,
  },
  star: {
    label: "Étoile",
    svg: `<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" fill="currentColor"/>`,
  },
  heart: {
    label: "Cœur",
    svg: `<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.3 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z" fill="currentColor"/>`,
  },
  check: {
    label: "Coche",
    svg: `<path d="M5 12.5l4.5 4.5L19 7.5" ${L} stroke-width="2.6"/>`,
  },
} as const;

export type StampIcon = keyof typeof STAMP_ICONS;
export const STAMP_ICON_IDS = Object.keys(STAMP_ICONS) as StampIcon[];
export const isStampIcon = (v: unknown): v is StampIcon => typeof v === "string" && v in STAMP_ICONS;

export interface CardTemplate {
  id: string;
  /** Métier affiché dans le studio. */
  label: string;
  group: "Bouche" | "Restauration" | "Beauté & bien-être" | "Commerces & services";
  icon: StampIcon;
  bgColor: string;
  fgColor: string;
  accentColor: string;
  /** Propositions (modifiables) pour le nom de la carte et la récompense. */
  cardName: string;
  rewardLabel: string;
  stampsRequired: number;
}

/** Modèles de départ par métier : couleurs, pictogramme et offre typique. Tout reste personnalisable. */
export const TEMPLATES: CardTemplate[] = [
  // ——— Métiers de bouche ———
  { id: "boulangerie", label: "Boulangerie", group: "Bouche", icon: "baguette", bgColor: "#3b2416", fgColor: "#fdf6ec", accentColor: "#e0a458", cardName: "Carte du fournil", rewardLabel: "1 baguette offerte", stampsRequired: 10 },
  { id: "viennoiserie", label: "Viennoiserie", group: "Bouche", icon: "croissant", bgColor: "#fbeed6", fgColor: "#4a2f12", accentColor: "#d98e2b", cardName: "Carte gourmande", rewardLabel: "1 viennoiserie offerte", stampsRequired: 8 },
  { id: "patisserie", label: "Pâtisserie", group: "Bouche", icon: "cake", bgColor: "#f6e3e7", fgColor: "#4a1f2e", accentColor: "#c2456b", cardName: "Carte douceurs", rewardLabel: "1 pâtisserie offerte", stampsRequired: 8 },
  { id: "chocolatier", label: "Chocolatier · Confiserie", group: "Bouche", icon: "candy", bgColor: "#2a160f", fgColor: "#f6e9dc", accentColor: "#c98a4b", cardName: "Carte gourmandise", rewardLabel: "1 ballotin offert", stampsRequired: 10 },
  { id: "boucherie", label: "Boucherie · Charcuterie", group: "Bouche", icon: "meat", bgColor: "#5c0f12", fgColor: "#fff1ea", accentColor: "#f08a5d", cardName: "Carte du boucher", rewardLabel: "5 € offerts", stampsRequired: 10 },
  { id: "fromagerie", label: "Fromagerie", group: "Bouche", icon: "cheese", bgColor: "#fff5cc", fgColor: "#463806", accentColor: "#d89a00", cardName: "Carte du fromager", rewardLabel: "1 fromage offert", stampsRequired: 10 },
  { id: "poissonnerie", label: "Poissonnerie", group: "Bouche", icon: "fish", bgColor: "#0b3c5d", fgColor: "#eaf6fb", accentColor: "#5fc2e6", cardName: "Carte de la marée", rewardLabel: "5 € offerts", stampsRequired: 10 },
  { id: "primeur", label: "Primeur · Épicerie", group: "Bouche", icon: "apple", bgColor: "#1f3d1a", fgColor: "#f1f8e9", accentColor: "#9ccc65", cardName: "Carte du marché", rewardLabel: "1 panier offert", stampsRequired: 10 },
  { id: "caviste", label: "Caviste", group: "Bouche", icon: "wine", bgColor: "#3a0d1e", fgColor: "#f8ece4", accentColor: "#c9a227", cardName: "Carte de la cave", rewardLabel: "1 bouteille offerte", stampsRequired: 10 },
  { id: "glacier", label: "Glacier", group: "Bouche", icon: "icecream", bgColor: "#fde2e4", fgColor: "#5b2333", accentColor: "#e86a86", cardName: "Carte glacée", rewardLabel: "1 glace offerte", stampsRequired: 8 },
  // ——— Restauration ———
  { id: "cafe", label: "Café · Coffee shop", group: "Restauration", icon: "coffee", bgColor: "#1d1410", fgColor: "#f3e9dc", accentColor: "#d4a373", cardName: "Carte café", rewardLabel: "1 café offert", stampsRequired: 10 },
  { id: "restaurant", label: "Restaurant", group: "Restauration", icon: "cutlery", bgColor: "#14213d", fgColor: "#f5efe0", accentColor: "#fca311", cardName: "Carte des habitués", rewardLabel: "1 dessert offert", stampsRequired: 10 },
  { id: "pizzeria", label: "Pizzeria", group: "Restauration", icon: "pizza", bgColor: "#7a1c12", fgColor: "#fff4e0", accentColor: "#f4b400", cardName: "Carte pizza", rewardLabel: "1 pizza offerte", stampsRequired: 10 },
  { id: "burger", label: "Burger · Snack · Kebab", group: "Restauration", icon: "burger", bgColor: "#1c1c1c", fgColor: "#fff6e5", accentColor: "#ffb703", cardName: "Carte snack", rewardLabel: "1 menu offert", stampsRequired: 10 },
  { id: "sushi", label: "Sushi · Asiatique", group: "Restauration", icon: "sushi", bgColor: "#101818", fgColor: "#f2efe6", accentColor: "#e63946", cardName: "Carte sushi", rewardLabel: "1 plateau offert", stampsRequired: 10 },
  { id: "traiteur", label: "Traiteur · Plats à emporter", group: "Restauration", icon: "bowl", bgColor: "#f3ede2", fgColor: "#2f2a20", accentColor: "#c8553d", cardName: "Carte du traiteur", rewardLabel: "1 plat offert", stampsRequired: 10 },
  { id: "bar", label: "Bar · Brasserie", group: "Restauration", icon: "beer", bgColor: "#102a2b", fgColor: "#f7f0dc", accentColor: "#f2b632", cardName: "Carte du comptoir", rewardLabel: "1 boisson offerte", stampsRequired: 10 },
  // ——— Beauté & bien-être ———
  { id: "coiffeur", label: "Coiffeur", group: "Beauté & bien-être", icon: "scissors", bgColor: "#111111", fgColor: "#f5f5f5", accentColor: "#d4af37", cardName: "Carte salon", rewardLabel: "1 brushing offert", stampsRequired: 8 },
  { id: "barbier", label: "Barbier", group: "Beauté & bien-être", icon: "scissors", bgColor: "#1b1512", fgColor: "#efe6d8", accentColor: "#b5813f", cardName: "Carte barber", rewardLabel: "1 taille de barbe offerte", stampsRequired: 8 },
  { id: "institut", label: "Institut de beauté", group: "Beauté & bien-être", icon: "sparkle", bgColor: "#f3e8e4", fgColor: "#4a2c2a", accentColor: "#b5536b", cardName: "Carte beauté", rewardLabel: "1 soin offert", stampsRequired: 8 },
  { id: "onglerie", label: "Onglerie", group: "Beauté & bien-être", icon: "nail", bgColor: "#fbe4ef", fgColor: "#5a1f3c", accentColor: "#e0457b", cardName: "Carte nails", rewardLabel: "1 pose offerte", stampsRequired: 8 },
  { id: "spa", label: "Spa · Massage", group: "Beauté & bien-être", icon: "leaf", bgColor: "#e8efe6", fgColor: "#2d3b2c", accentColor: "#6a994e", cardName: "Carte bien-être", rewardLabel: "1 massage offert", stampsRequired: 8 },
  { id: "sport", label: "Salle de sport · Coach", group: "Beauté & bien-être", icon: "dumbbell", bgColor: "#111827", fgColor: "#f9fafb", accentColor: "#22c55e", cardName: "Carte training", rewardLabel: "1 séance offerte", stampsRequired: 10 },
  // ——— Commerces & services ———
  { id: "fleuriste", label: "Fleuriste", group: "Commerces & services", icon: "flower", bgColor: "#f1f7ee", fgColor: "#2f4a2a", accentColor: "#e76f51", cardName: "Carte fleurie", rewardLabel: "1 bouquet offert", stampsRequired: 10 },
  { id: "librairie", label: "Librairie · Papeterie", group: "Commerces & services", icon: "book", bgColor: "#1e2a3a", fgColor: "#f4efe6", accentColor: "#e9c46a", cardName: "Carte lecteur", rewardLabel: "1 livre offert", stampsRequired: 10 },
  { id: "pressing", label: "Pressing · Retouches", group: "Commerces & services", icon: "shirt", bgColor: "#0d3b66", fgColor: "#f4f8fb", accentColor: "#4cc9f0", cardName: "Carte pressing", rewardLabel: "1 nettoyage offert", stampsRequired: 10 },
  { id: "animalerie", label: "Animalerie · Toilettage", group: "Commerces & services", icon: "paw", bgColor: "#fff4e6", fgColor: "#4a3222", accentColor: "#f08c3a", cardName: "Carte compagnon", rewardLabel: "1 toilettage offert", stampsRequired: 8 },
  { id: "auto", label: "Lavage auto · Garage", group: "Commerces & services", icon: "car", bgColor: "#0f172a", fgColor: "#e2e8f0", accentColor: "#38bdf8", cardName: "Carte auto", rewardLabel: "1 lavage offert", stampsRequired: 10 },
  { id: "boutique", label: "Boutique · Cadeaux", group: "Commerces & services", icon: "gift", bgColor: "#1f1033", fgColor: "#f5f0ff", accentColor: "#c084fc", cardName: "Carte privilège", rewardLabel: "10 € offerts", stampsRequired: 10 },
  { id: "qamar", label: "Autre commerce", group: "Commerces & services", icon: "star", bgColor: "#0b0b0d", fgColor: "#f5f3ef", accentColor: "#FC4F00", cardName: "Carte fidélité", rewardLabel: "1 produit offert", stampsRequired: 10 },
];

export const TEMPLATE_GROUPS = ["Bouche", "Restauration", "Beauté & bien-être", "Commerces & services"] as const;

/** Motif décoratif : le pictogramme répété en filigrane sur la bannière de la carte (SVG). */
export function patternSvg(icon: StampIcon, w: number, h: number, color: string, opacity = 0.07) {
  const size = Math.round(h * 0.2);
  const step = size * 2.1;
  let out = "";
  let row = 0;
  for (let y = -size / 2; y < h + size; y += step * 0.75, row++) {
    for (let x = (row % 2 ? step / 2 : 0) - size / 2; x < w + size; x += step) {
      const s = size / 24;
      out += `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(-14 ${12 * s} ${12 * s}) scale(${s.toFixed(3)})" color="${color}">${STAMP_ICONS[icon].svg}</g>`;
    }
  }
  return `<g opacity="${opacity}">${out}</g>`;
}
