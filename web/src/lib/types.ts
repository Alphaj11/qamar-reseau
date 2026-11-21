// Types métier — miroir du schéma supabase/migrations/0001_init.sql

export type ProgramType = "stamps" | "points";
import type { StampIcon } from "./card-design";
export type { StampIcon };

export interface Program {
  id: string;
  merchantId: string;
  slug: string;
  type: ProgramType;
  name: string;
  merchantName: string;
  rewardLabel: string;
  stampsRequired: number;
  pointsRequired: number;
  pointsPerEuro: number;
  welcomeBonus: number;
  bgColor: string;
  fgColor: string;
  accentColor: string;
  logoUrl?: string;
  /** Logo du commerce (PNG 256 × 256 en data URL), remplace l'initiale sur la carte. */
  logo?: string;
  stampIcon: StampIcon;
  /** Modèle de métier choisi dans le studio (boulangerie, pizzeria…). */
  template?: string;
  /** Pictogramme répété en filigrane sur la bannière. */
  pattern?: boolean;
  terms?: string;
  /** Boutiques (max 10) : la carte s'affiche sur l'écran verrouillé de l'iPhone à proximité. */
  locations?: StoreLocation[];
  /** Panier moyen en euros, saisi par le commerçant : sert seulement à estimer le chiffre d'affaires. */
  averageBasket?: number;
  /** Date de la première personnalisation (checklist de démarrage). */
  customizedAt?: string;
  /** Relance automatique des clients absents (désactivée par défaut). */
  winback?: WinbackSettings;
  /** Demande d'avis Google après quelques visites (désactivée par défaut). */
  review?: ReviewSettings;
  /** Offre d'anniversaire (désactivée par défaut). */
  birthday?: BirthdaySettings;
}

export interface BirthdaySettings {
  enabled: boolean;
  /** Ajoute une récompense offerte sur la carte le jour de l'anniversaire. */
  gift: boolean;
  message: string;
}

export interface ReviewSettings {
  enabled: boolean;
  /** Lien d'avis de la fiche Google de l'établissement. */
  url: string;
  /** Nombre de visites après lequel le client est sollicité (une seule fois). */
  afterVisits: number;
  message: string;
}

export interface WinbackSettings {
  enabled: boolean;
  /** Nombre de jours sans passage avant la relance. */
  days: number;
  message: string;
}

/** Trace d'une relance envoyée à une carte : sert à mesurer les retours et à ne pas relancer deux fois. */
export interface Winback {
  id: string;
  programId: string;
  cardId: string;
  sentAt: string;
}

export type SubscriptionStatus = "pending" | "trialing" | "active" | "past_due" | "canceled";
export type PlanId = "monthly" | "yearly";

/** Commerce abonné. Sans abonnement actif, l'appli et l'inscription des clients sont bloquées. */
export interface Merchant {
  id: string;
  name: string;
  createdAt: string;
  /** Boutique de démonstration (bouton « Découvrir l'appli ») : lecture seule. */
  demo?: boolean;
  demoRefreshedAt?: string;
  subscription: {
    status: SubscriptionStatus;
    /** Formule choisie à l'inscription (mensuelle par défaut). */
    plan?: PlanId;
    /** Fin de l'essai gratuit, si le commerce en a bénéficié. */
    trialEnd?: string;
    currentPeriodEnd?: string;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    updatedAt: string;
  };
}

export interface StoreLocation {
  latitude: number;
  longitude: number;
  /** Texte affiché sur l'écran verrouillé, ex. "Votre café offert vous attend". */
  relevantText?: string;
}

export interface Customer {
  id: string;
  merchantId: string;
  firstName: string;
  email?: string;
  phone?: string;
  marketingConsent: boolean;
  marketingConsentAt?: string;
  /** Anniversaire au format "MM-JJ" (sans l'année), donné volontairement à l'inscription. */
  birthday?: string;
  createdAt: string;
}

export interface Card {
  id: string;
  programId: string;
  customerId: string;
  serial: string;
  authToken: string;
  stamps: number;
  points: number;
  rewardsAvailable: number;
  rewardsRedeemed: number;
  lastMessage?: string;
  /** Date de la demande d'avis Google (un client n'est sollicité qu'une fois). */
  reviewAskedAt?: string;
  /** Dernière année où le client a été fêté (une fois par an). */
  birthdayYear?: number;
  googleObjectId?: string;
  createdAt: string;
  updatedAt: string;
}

export type StaffRole = "owner" | "staff";

export interface Staff {
  id: string;
  /** owner = patron (réglages, messages, stats) ; staff = vendeur (caisse seulement) */
  role: StaffRole;
  merchantId: string;
  name: string;
  email: string;
  pinHash: string;
}

export interface StaffSession {
  token: string;
  staffId: string;
  createdAt: string;
}

export type TransactionKind = "stamp" | "points" | "reward";

export interface Transaction {
  id: string;
  cardId: string;
  staffId: string;
  kind: TransactionKind;
  amount: number;
  /** Identifiant généré par l'appli : rend la synchronisation hors ligne sans doublon. */
  clientOpId: string;
  /** Heure du passage en caisse (côté téléphone), peut précéder la synchro. */
  occurredAt: string;
  createdAt: string;
}

/** Message envoyé aux clients (notification sur la carte Wallet). */
export interface Campaign {
  id: string;
  programId: string;
  message: string;
  createdBy: string;
  createdAt: string;
  sentAt?: string;
  recipients: number;
  /** Cartes destinataires : sert à mesurer combien sont revenus après le message. */
  cardIds?: string[];
}

/** Téléphone ayant ajouté une carte dans Apple Wallet (service web PassKit). */
export interface AppleRegistration {
  deviceLibraryId: string;
  pushToken: string;
  serial: string;
  createdAt: string;
}
