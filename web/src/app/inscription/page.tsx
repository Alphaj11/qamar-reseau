// Page d'inscription commerçant : l'offre (25 € HT / mois ou 250 € HT / an, essai gratuit) et la création du compte.
// Le paiement se fait ici, sur le web, jamais dans l'appli.
import { SiteHeader } from "@/components/QamarLogo";
import { availablePlans, PLANS, TRIAL_DAYS } from "@/lib/subscription";
import { SignupForm } from "./SignupForm";

const INCLUDED = [
  "Votre carte de fidélité dans Apple Wallet et Google Wallet, à vos couleurs",
  "Tampons ou points, récompense au choix, clients illimités",
  "L'application de caisse pour iPhone et Android, qui fonctionne même sans réseau",
  "Messages à vos clients (promos, nouveautés) directement sur leur carte",
  "Relance automatique des clients absents, offre d'anniversaire, demande d'avis Google",
  "Rappel sur le téléphone du client quand il passe près de votre boutique",
  "Tableau de bord : passages, clients fidèles, clients à relancer",
  "QR code et affiche à imprimer pour inscrire vos clients en 10 secondes",
  "Comptes pour vos vendeurs",
];

export default function SignupPage() {
  const plans = availablePlans().map((id) => PLANS[id]);
  return (
    <>
    <SiteHeader />
    <main className="mx-auto grid w-full max-w-5xl gap-10 px-4 py-10 md:grid-cols-2 md:py-16">
      <section className="flex flex-col gap-6">
        <p className="label-mono text-muted">Carte de fidélité · Apple Wallet &amp; Google Wallet</p>
        <h1 className="text-4xl font-bold leading-[1.05] tracking-tight md:text-5xl">
          La fidélité de votre commerce, dans le téléphone de vos clients<span className="text-accent">.</span>
        </h1>
        <p className="text-lg text-muted">Vos clients n&apos;installent rien : ils scannent un QR code en caisse et la carte s&apos;ajoute à leur Wallet.</p>

        <div className="rounded-3xl border border-line bg-surface p-6">
          {TRIAL_DAYS > 0 && (
            <p className="label-mono mb-4 inline-block rounded-md bg-accent-soft px-2.5 py-1.5 text-accent">
              {TRIAL_DAYS} jours gratuits pour essayer
            </p>
          )}
          <p className="label-mono text-muted">Un seul abonnement, tout compris</p>
          <p className="mt-2 text-5xl font-semibold tracking-tight">
            25 €<span className="text-lg font-normal tracking-normal text-muted"> HT / mois</span>
          </p>
          <p className="mt-1 text-sm text-muted">
            {PLANS.monthly.ttc}, sans engagement
            {plans.some((p) => p.id === "yearly") && <> · ou {PLANS.yearly.label}, 2 mois offerts</>}
          </p>
          <ul className="mt-5 flex flex-col gap-2.5 border-t border-line pt-5 text-sm">
            {INCLUDED.map((item) => (
              <li key={item} className="flex gap-3">
                <span aria-hidden className="mt-1.5 size-2 shrink-0 bg-accent" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-muted">
          Paiement sécurisé par Stripe.
          {TRIAL_DAYS > 0 &&
            ` Votre carte bancaire est demandée à l'inscription, mais rien n'est prélevé pendant les ${TRIAL_DAYS} jours d'essai. Résiliez avant la fin de l'essai et vous ne payez rien.`}{" "}
          Résiliation à tout moment depuis votre espace de facturation. Rappel près de la boutique : c&apos;est le
          téléphone du client qui décide de l&apos;afficher, selon ses réglages.
        </p>
      </section>

      <section className="flex h-fit flex-col gap-5 rounded-3xl border border-line bg-surface p-5 md:sticky md:top-6 md:p-7">
        <h2 className="text-2xl font-semibold tracking-tight">Créer mon compte</h2>
        <SignupForm
          plans={plans.map(({ id, name, label, ttc, detail }) => ({ id, name, label, ttc, detail }))}
          cta={TRIAL_DAYS > 0 ? `Commencer l'essai gratuit de ${TRIAL_DAYS} jours` : "Continuer vers le paiement"}
        />
      </section>
    </main>
    </>
  );
}
