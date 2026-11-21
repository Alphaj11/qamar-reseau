// Abonnement des commerçants : offre, création de compte, paiement Stripe.
// Le paiement se fait sur le site (jamais dans l'appli) : l'appli iPhone/Android
// est un compagnon gratuit d'un service payé sur le web (règle App Store 3.1.3(f)).
//
// Stripe est appelé en HTTP direct (pas de SDK). Variables : STRIPE_SECRET_KEY,
// STRIPE_PRICE_ID (prix mensuel), STRIPE_PRICE_ID_YEARLY (prix annuel, optionnel), STRIPE_WEBHOOK_SECRET,
// TRIAL_DAYS (essai gratuit, 14 jours par défaut ; 0 pour le couper).
// Sans Stripe configuré, en développement, le paiement est simulé.
import "server-only";
import crypto from "crypto";
import { hashPin, load, mutate, type DevDb } from "./db";
import type { Merchant, PlanId, Program, SubscriptionStatus } from "./types";
import { publicUrl } from "./wallet/config";

const rawTrial = process.env.TRIAL_DAYS;

/** Essai gratuit : carte bancaire demandée à l'inscription, premier prélèvement à la fin de l'essai. */
export const TRIAL_DAYS = rawTrial === undefined || rawTrial === "" ? 14 : Math.max(0, Math.floor(Number(rawTrial)) || 0);

export const PLANS: Record<PlanId, { id: PlanId; name: string; label: string; ttc: string; detail: string; months: number }> = {
  monthly: {
    id: "monthly",
    name: "Formule mensuelle",
    label: "25 € HT / mois",
    ttc: "soit 30 € TTC par mois",
    detail: "Sans engagement, résiliable à tout moment",
    months: 1,
  },
  yearly: {
    id: "yearly",
    name: "Formule annuelle",
    label: "250 € HT / an",
    ttc: "soit 300 € TTC par an",
    detail: "2 mois offerts, soit 20,83 € HT par mois",
    months: 12,
  },
};

/** Compatibilité : la formule de référence affichée partout (25 € HT / mois). */
export const PLAN = { ...PLANS.monthly, trialDays: TRIAL_DAYS };

export const isPlanId = (v: unknown): v is PlanId => v === "monthly" || v === "yearly";

/** Formules proposées à l'inscription : la formule annuelle n'apparaît que si son prix Stripe existe. */
export function availablePlans(): PlanId[] {
  const cfg = stripeConfig();
  return !cfg || cfg.prices.yearly ? ["monthly", "yearly"] : ["monthly"];
}

/** Statuts qui donnent accès à l'appli. "past_due" : Stripe retente le paiement, on laisse travailler. */
export function isActive(status: SubscriptionStatus) {
  return status === "active" || status === "trialing" || status === "past_due";
}

export function subscriptionView(m: Merchant) {
  const plan = PLANS[m.subscription.plan ?? "monthly"];
  return {
    status: m.subscription.status,
    active: isActive(m.subscription.status),
    currentPeriodEnd: m.subscription.currentPeriodEnd,
    trialEnd: m.subscription.status === "trialing" ? m.subscription.trialEnd : undefined,
    planId: plan.id,
    /** Nom sans prix : affichable dans les applis iPhone / Android. */
    planName: plan.name,
    /** Prix : réservé au site web. */
    plan: plan.label,
  };
}

/** Boutique de démonstration : tout est en lecture seule. */
export async function merchantIsDemo(merchantId: string) {
  return !!(await load()).merchants.find((x) => x.id === merchantId)?.demo;
}

export async function merchantIsActive(merchantId: string) {
  const m = (await load()).merchants.find((x) => x.id === merchantId);
  return !!m && isActive(m.subscription.status);
}

// ——— Création de compte ———

export class SignupError extends Error {}

function slugify(name: string) {
  return (
    name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 30) || "commerce"
  );
}

function uniqueSlug(db: DevDb, name: string) {
  const base = slugify(name);
  let slug = base;
  for (let i = 2; db.programs.some((p) => p.slug === slug); i++) slug = `${base}-${i}`;
  return slug;
}

export interface SignupInput {
  businessName: string;
  ownerName: string;
  email: string;
  pin: string;
  plan?: PlanId;
}

/** Crée le commerce (en attente de paiement), le compte du patron et une carte par défaut. */
export function createAccount(input: SignupInput) {
  return mutate((db) => {
    const email = input.email.trim().toLowerCase();
    if (db.staff.some((s) => s.email.toLowerCase() === email)) {
      throw new SignupError("Un compte existe déjà avec cet e-mail");
    }
    const now = new Date().toISOString();
    const merchant: Merchant = {
      id: crypto.randomUUID(),
      name: input.businessName,
      createdAt: now,
      subscription: { status: "pending", plan: input.plan ?? "monthly", updatedAt: now },
    };
    const program: Program = {
      id: crypto.randomUUID(),
      merchantId: merchant.id,
      slug: uniqueSlug(db, input.businessName),
      type: "stamps",
      name: "Carte fidélité",
      merchantName: input.businessName,
      rewardLabel: "1 produit offert",
      stampsRequired: 10,
      pointsRequired: 100,
      pointsPerEuro: 1,
      welcomeBonus: 1,
      bgColor: "#1f2937",
      fgColor: "#ffffff",
      accentColor: "#f59e0b",
      stampIcon: "star",
      terms: "Un tampon par passage en caisse.",
      locations: [],
    };
    db.merchants.push(merchant);
    db.programs.push(program);
    db.staff.push({
      id: crypto.randomUUID(),
      role: "owner",
      merchantId: merchant.id,
      name: input.ownerName,
      email,
      pinHash: hashPin(input.pin),
    });
    return merchant;
  });
}

function setSubscription(match: (m: Merchant) => boolean, patch: Partial<Merchant["subscription"]>) {
  return mutate((db) => {
    const m = db.merchants.find(match);
    if (!m) return undefined;
    Object.assign(m.subscription, patch, { updatedAt: new Date().toISOString() });
    return m;
  });
}

/** L'essai gratuit n'est accordé qu'au premier abonnement (pas après une résiliation). */
export const trialEligible = (m: Merchant) =>
  TRIAL_DAYS > 0 && m.subscription.status === "pending" && !m.subscription.stripeSubscriptionId && !m.subscription.trialEnd;

/** Développement seulement : active l'abonnement sans paiement (avec l'essai, comme Stripe le ferait). */
export async function simulatePayment(merchantId: string) {
  if (stripeConfig() || process.env.NODE_ENV === "production") throw new Error("Paiement simulé désactivé");
  const merchant = (await load()).merchants.find((m) => m.id === merchantId);
  if (!merchant) return undefined;
  if (trialEligible(merchant)) {
    const trialEnd = new Date(Date.now() + TRIAL_DAYS * 86400_000).toISOString();
    return setSubscription((m) => m.id === merchantId, { status: "trialing", trialEnd, currentPeriodEnd: trialEnd });
  }
  const months = PLANS[merchant.subscription.plan ?? "monthly"].months;
  const end = new Date(Date.now() + months * 30 * 86400_000).toISOString();
  return setSubscription((m) => m.id === merchantId, { status: "active", currentPeriodEnd: end });
}

// ——— Stripe ———

export function stripeConfig() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const monthly = process.env.STRIPE_PRICE_ID;
  if (!secretKey || !monthly) return undefined;
  return {
    secretKey,
    prices: { monthly, yearly: process.env.STRIPE_PRICE_ID_YEARLY || undefined } as Record<PlanId, string | undefined>,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  };
}

async function stripePost(path: string, params: Record<string, string>) {
  const cfg = stripeConfig();
  if (!cfg) throw new Error("Stripe non configuré");
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.secretKey}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });
  const json = (await res.json()) as { url?: string; error?: { message?: string } };
  if (!res.ok || !json.url) throw new Error(`Stripe ${path} : ${json.error?.message ?? res.status}`);
  return json.url;
}

/** Page de paiement Stripe pour un commerce en attente. */
export function createCheckout(merchant: Merchant, email: string) {
  const cfg = stripeConfig()!;
  const price = cfg.prices[merchant.subscription.plan ?? "monthly"] ?? cfg.prices.monthly!;
  const params: Record<string, string> = {
    mode: "subscription",
    "line_items[0][price]": price,
    "line_items[0][quantity]": "1",
    client_reference_id: merchant.id,
    customer_email: email,
    locale: "fr",
    allow_promotion_codes: "true",
    billing_address_collection: "required",
    "tax_id_collection[enabled]": "true",
    "subscription_data[metadata][merchantId]": merchant.id,
    success_url: `${publicUrl()}/inscription/merci?m=${merchant.id}`,
    cancel_url: `${publicUrl()}/inscription/merci?m=${merchant.id}&annule=1`,
  };
  if (trialEligible(merchant)) {
    params["subscription_data[trial_period_days]"] = String(TRIAL_DAYS);
    // Carte bancaire obligatoire même pendant l'essai : pas de coupure à la fin
    params.payment_method_collection = "always";
    params["subscription_data[trial_settings][end_behavior][missing_payment_method]"] = "cancel";
  }
  return stripePost("checkout/sessions", params);
}

/** Espace client Stripe : factures, carte bancaire, résiliation. */
export function createPortal(merchant: Merchant) {
  if (!merchant.subscription.stripeCustomerId) throw new Error("Aucun client Stripe");
  return stripePost("billing_portal/sessions", {
    customer: merchant.subscription.stripeCustomerId,
    return_url: `${publicUrl()}/inscription/merci?m=${merchant.id}`,
  });
}

/** Vérifie l'en-tête Stripe-Signature (HMAC SHA-256, tolérance 5 min). */
export function verifyStripeSignature(payload: string, header: string | null, secret: string, now = Date.now()) {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]));
  const t = Number(parts.t);
  const signatures = header
    .split(",")
    .filter((p) => p.startsWith("v1="))
    .map((p) => p.slice(3));
  if (!t || !signatures.length || Math.abs(now / 1000 - t) > 300) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${t}.${payload}`).digest();
  return signatures.some((s) => {
    const given = Buffer.from(s, "hex");
    return given.length === expected.length && crypto.timingSafeEqual(given, expected);
  });
}

function mapStatus(stripeStatus: string): SubscriptionStatus {
  switch (stripeStatus) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
      return "past_due";
    case "incomplete":
      return "pending";
    default:
      return "canceled"; // canceled, unpaid, incomplete_expired, paused
  }
}

interface StripeEvent {
  type: string;
  data: { object: Record<string, unknown> };
}

/** Met à jour l'abonnement d'après un évènement Stripe. Renvoie le commerce modifié, s'il est connu. */
export async function applyStripeEvent(event: StripeEvent) {
  const o = event.data.object;
  const str = (v: unknown) => (typeof v === "string" ? v : undefined);

  if (event.type === "checkout.session.completed") {
    const merchantId = str(o.client_reference_id);
    if (!merchantId) return undefined;
    const current = (await load()).merchants.find((m) => m.id === merchantId);
    // L'évènement « abonnement » peut arriver avant : on ne remplace pas un essai en cours par « actif »
    const keep = current && (current.subscription.status === "trialing" || current.subscription.status === "active");
    return setSubscription((m) => m.id === merchantId, {
      ...(keep ? {} : { status: "active" as const }),
      stripeCustomerId: str(o.customer),
      stripeSubscriptionId: str(o.subscription),
    });
  }

  if (event.type.startsWith("customer.subscription.")) {
    const subId = str(o.id);
    const metaId = str((o.metadata as Record<string, unknown> | undefined)?.merchantId);
    // Selon la version de l'API Stripe, la fin de période est sur l'abonnement ou sur ses lignes
    const items = (o.items as { data?: { current_period_end?: number; price?: { id?: string; recurring?: { interval?: string } } }[] } | undefined)?.data;
    const end = (o.current_period_end as number | undefined) ?? items?.[0]?.current_period_end;
    const trialEnd = o.trial_end as number | undefined;
    const interval = items?.[0]?.price?.recurring?.interval;
    const priceId = items?.[0]?.price?.id;
    const cfg = stripeConfig();
    const plan: PlanId | undefined =
      interval === "year" || (priceId && priceId === cfg?.prices.yearly) ? "yearly" : interval === "month" || priceId ? "monthly" : undefined;
    const status = event.type === "customer.subscription.deleted" ? "canceled" : mapStatus(String(o.status));
    return setSubscription((m) => m.id === metaId || (!!subId && m.subscription.stripeSubscriptionId === subId), {
      status,
      stripeSubscriptionId: subId,
      stripeCustomerId: str(o.customer),
      ...(end ? { currentPeriodEnd: new Date(end * 1000).toISOString() } : {}),
      ...(trialEnd ? { trialEnd: new Date(trialEnd * 1000).toISOString() } : {}),
      ...(plan ? { plan } : {}),
    });
  }

  if (event.type === "invoice.payment_failed") {
    const customer = str(o.customer);
    if (!customer) return undefined;
    return setSubscription((m) => m.subscription.stripeCustomerId === customer, { status: "past_due" });
  }
  return undefined;
}

/** Résilie immédiatement un abonnement Stripe (suppression du compte). Sans Stripe configuré : rien à faire. */
export async function cancelStripeSubscription(subscriptionId: string) {
  const cfg = stripeConfig();
  if (!cfg) return;
  const res = await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${cfg.secretKey}` },
  });
  // 404 : déjà résilié ou supprimé côté Stripe
  if (!res.ok && res.status !== 404) throw new Error(`Stripe résiliation : ${res.status}`);
}
