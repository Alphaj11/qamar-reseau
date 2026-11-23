// Formes échangées avec l'API caisse (web/src/lib/staff.ts)
import type { StampIcon } from "./card-design";

export type { StampIcon };

export type ProgramType = "stamps" | "points";
export type OpKind = "stamp" | "points" | "reward";

export interface ProgramView {
  id: string;
  name: string;
  merchantName: string;
  type: ProgramType;
  rewardLabel: string;
  stampsRequired: number;
  pointsRequired: number;
  pointsPerEuro: number;
  bgColor: string;
  fgColor: string;
  accentColor: string;
  stampIcon?: StampIcon;
  pattern?: boolean;
  logo?: string;
  banner?: string;
  labelColor?: string;
}

export interface CardView {
  serial: string;
  firstName: string;
  programId: string;
  stamps: number;
  points: number;
  rewardsAvailable: number;
  updatedAt: string;
}

/** Un passage en caisse enregistré sur le téléphone, en attente d'envoi ou envoyé. */
export interface PendingOp {
  clientOpId: string;
  serial: string;
  kind: OpKind;
  amount: number;
  occurredAt: string;
}

export type SyncResult =
  | { clientOpId: string; status: "applied" | "duplicate"; card: CardView }
  | { clientOpId: string; status: "rejected"; reason: string; card?: CardView };

export type SubscriptionStatus = "pending" | "trialing" | "active" | "past_due" | "canceled";

export interface Subscription {
  status: SubscriptionStatus;
  /** false : l'appli est bloquée (écran Abonnement). */
  active: boolean;
  currentPeriodEnd?: string;
  /** Fin de l'essai gratuit (seulement pendant l'essai). */
  trialEnd?: string;
  planId?: "monthly" | "yearly";
  /** Nom de la formule, sans prix (affichable dans les applis des stores). */
  planName?: string;
  /** Prix de la formule : réservé à la version web. */
  plan: string;
}

export interface Snapshot {
  merchantName: string;
  subscription?: Subscription;
  programs: ProgramView[];
  cards: CardView[];
  serverTime: string;
}

export type StaffRole = "owner" | "staff";

export interface Session {
  token: string;
  staff: { id: string; name: string; merchantId: string; role?: StaffRole };
  subscription?: Subscription;
  /** Boutique de démonstration (« Découvrir l'appli ») : rien n'est enregistré. */
  demo?: boolean;
}

// ——— Écrans du responsable (en ligne uniquement) ———

export interface CustomerRow {
  serial: string;
  firstName: string;
  email?: string;
  phone?: string;
  marketingConsent: boolean;
  /** "MM-JJ" */
  birthday?: string;
  stamps: number;
  points: number;
  rewardsAvailable: number;
  rewardsRedeemed: number;
  visits: number;
  lastVisitAt?: string;
  createdAt: string;
  inAppleWallet: boolean;
}

export interface HistoryEntry {
  kind: OpKind;
  amount: number;
  occurredAt: string;
  by: string;
}

export interface PeriodFigures {
  visits: number;
  activeCustomers: number;
  newCustomers: number;
  rewardsRedeemed: number;
}

export interface Stats extends PeriodFigures {
  periodDays: number;
  previous: PeriodFigures;
  customers: number;
  stampsGiven: number;
  pointsGiven: number;
  rewardsPending: number;
  returningRate: number | null;
  avgVisitsPerActive: number | null;
  inactiveCustomers: number;
  averageBasket: number | null;
  estimatedRevenue: number | null;
  optIn: number;
  inAppleWallet: number;
  googleLinks: number;
  daily: { date: string; visits: number }[];
  /** 0 = lundi … 6 = dimanche */
  byWeekday: number[];
  byHour: number[];
  topCustomers: { serial: string; firstName: string; visits: number }[];
  campaigns: { id: string; message: string; createdAt: string; recipients: number; returned: number }[];
}

export interface Home {
  merchantName: string;
  slug: string;
  programType: ProgramType;
  today: { visits: number; newCustomers: number; rewardsRedeemed: number };
  yesterday: { visits: number };
  customers: number;
  rewardsPending: number;
  recent: { id: string; serial: string; firstName: string; kind: OpKind; amount: number; occurredAt: string; by: string }[];
  onboarding: { customized: boolean; location: boolean; firstCustomer: boolean; firstVisit: boolean };
}

export interface Account {
  staff: { id: string; name: string; email: string; role: StaffRole };
  merchant: { id: string; name: string };
  subscription: Subscription | null;
  enrollUrl: string | null;
  posterUrl: string | null;
  qrUrl: string | null;
  webUrl: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  me: boolean;
}


export interface StoreLocation {
  latitude: number;
  longitude: number;
  relevantText?: string;
}

export interface WinbackSettings {
  enabled: boolean;
  days: number;
  message: string;
}

export interface WinbackOverview {
  settings: WinbackSettings;
  dueNow: number;
  absentWithoutConsent: number;
  last90Days: { sent: number; returned: number };
  returnDays: number;
}

export interface ReviewSettings {
  enabled: boolean;
  url: string;
  afterVisits: number;
  message: string;
}

export interface ReviewOverview {
  settings: ReviewSettings;
  asked: number;
  askedLast30Days: number;
}

export interface BirthdaySettings {
  enabled: boolean;
  gift: boolean;
  message: string;
}

export interface BirthdayOverview {
  settings: BirthdaySettings;
  known: number;
  thisMonth: number;
  celebratedThisYear: number;
}

export interface ProgramSettings {
  slug: string;
  name: string;
  merchantName: string;
  type: ProgramType;
  rewardLabel: string;
  stampsRequired: number;
  pointsRequired: number;
  pointsPerEuro: number;
  welcomeBonus: number;
  bgColor: string;
  fgColor: string;
  accentColor: string;
  stampIcon: StampIcon;
  template?: string;
  pattern?: boolean;
  /** Logo du commerce (data URL PNG), modifié par une route à part. */
  logo?: string;
  /** Photo de fond de la bannière (data URL JPEG), modifiée par une route à part. */
  banner?: string;
  /** Couleur des petits titres (« Récompense »…). Absente : couleur du texte. */
  labelColor?: string;
  terms?: string;
  locations: StoreLocation[];
  averageBasket?: number;
}

export interface Campaign {
  id: string;
  message: string;
  createdAt: string;
  sentAt?: string;
  recipients: number;
}
