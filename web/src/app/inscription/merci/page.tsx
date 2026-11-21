// Retour après le paiement : état de l'abonnement et étapes suivantes.
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { load } from "@/lib/db";
import { createCheckout, isActive, PLANS, simulatePayment, stripeConfig, TRIAL_DAYS, trialEligible } from "@/lib/subscription";
import { PageSkeleton } from "@/components/PageSkeleton";
import { BRAND } from "@/lib/brand";
import { SiteHeader } from "@/components/QamarLogo";

export default function ThanksPage({ searchParams }: PageProps<"/inscription/merci">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Thanks searchParams={searchParams} />
    </Suspense>
  );
}

async function resumePayment(merchantId: string) {
  "use server";
  const db = await load();
  const merchant = db.merchants.find((m) => m.id === merchantId);
  const owner = db.staff.find((s) => s.merchantId === merchantId && s.role === "owner");
  if (!merchant || !owner) return;
  redirect(await createCheckout(merchant, owner.email));
}

async function simulate(merchantId: string) {
  "use server";
  await simulatePayment(merchantId);
  redirect(`/inscription/merci?m=${merchantId}`);
}

async function Thanks({ searchParams }: { searchParams: PageProps<"/inscription/merci">["searchParams"] }) {
  const sp = await searchParams;
  const id = typeof sp.m === "string" ? sp.m : "";
  const db = await load();
  const merchant = db.merchants.find((m) => m.id === id);
  const owner = db.staff.find((s) => s.merchantId === id && s.role === "owner");
  const program = db.programs.find((p) => p.merchantId === id);
  if (!merchant || !owner) {
    return (
      <main className="mx-auto max-w-md px-4 py-16">
        <h1 className="text-2xl font-semibold">Compte introuvable</h1>
      </main>
    );
  }

  const active = isActive(merchant.subscription.status);
  const devMode = !stripeConfig() && process.env.NODE_ENV !== "production";
  const plan = PLANS[merchant.subscription.plan ?? "monthly"];
  const trial = trialEligible(merchant);
  const trialEnd = merchant.subscription.status === "trialing" ? merchant.subscription.trialEnd : undefined;
  const longDate = (iso: string) => new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "Europe/Paris" }).format(new Date(iso));

  return (
    <>
    <SiteHeader />
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-12">
      <p className="label-mono text-muted">{active ? "Compte actif" : "Dernière étape"}</p>
      {active ? (
        <>
          <h1 className="text-3xl font-bold leading-tight tracking-tight">
            C&apos;est prêt, {merchant.name} est en ligne<span className="text-accent">.</span>
          </h1>
          {trialEnd && (
            <p className="rounded-2xl bg-accent-soft px-4 py-3 text-sm">
              Essai gratuit jusqu&apos;au <span className="font-medium">{longDate(trialEnd)}</span>. Le premier prélèvement
              ({plan.label}) aura lieu à cette date, sauf si vous résiliez avant.
            </p>
          )}
          <ol className="flex list-decimal flex-col gap-3 rounded-3xl border border-line bg-surface py-5 pl-10 pr-5 text-muted marker:font-mono marker:text-accent">
            <li>
              Installez l&apos;application <span className="font-medium text-foreground">{BRAND.name}</span> sur votre téléphone
              (App Store ou Google Play).
            </li>
            <li>
              Connectez-vous avec <span className="font-medium text-foreground">{owner.email}</span> et votre code.
            </li>
            <li>Personnalisez votre carte dans l&apos;onglet Carte, puis affichez le QR code en caisse.</li>
          </ol>
          {program && (
            <a href={`/c/${program.slug}/affiche`} className="btn-qamar">
              Voir mon affiche avec le QR code
            </a>
          )}
        </>
      ) : (
        <>
          <h1 className="text-3xl font-bold leading-tight tracking-tight">
            {sp.annule
              ? "Le paiement n'a pas été terminé."
              : trial
                ? "Votre compte est créé, il reste à enregistrer votre carte bancaire."
                : "Votre compte est créé, il reste le paiement."}
          </h1>
          <p className="text-muted">
            {trial
              ? `Rien n'est prélevé pendant les ${TRIAL_DAYS} jours d'essai. Ensuite : ${plan.name.toLowerCase()}, ${plan.label}. Résiliable à tout moment.`
              : `L'application et votre carte de fidélité s'activent dès que l'abonnement est réglé (${plan.name.toLowerCase()}, ${plan.label}).`}
          </p>
          {stripeConfig() && (
            <form action={resumePayment.bind(null, merchant.id)}>
              <button className="btn-qamar w-full">
                {trial ? "Commencer l'essai gratuit" : "Payer et activer"}
              </button>
            </form>
          )}
          {devMode && (
            <form action={simulate.bind(null, merchant.id)} className="flex flex-col gap-2">
              <button className="w-full rounded-2xl border border-dashed border-line px-4 py-3.5 font-medium hover:bg-surface">
                {trial ? "Simuler l'enregistrement de la carte (mode test)" : "Simuler le paiement (mode test)"}
              </button>
              <span className="text-xs text-muted">Visible seulement en développement, tant que Stripe n&apos;est pas branché.</span>
            </form>
          )}
        </>
      )}
    </main>
    </>
  );
}
