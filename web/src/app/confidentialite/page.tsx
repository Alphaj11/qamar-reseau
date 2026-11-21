// Politique de confidentialité (exigée par l'App Store et le RGPD).
// Rédigée d'après ce que fait réellement l'application ; à faire relire avant l'ouverture.
import type { Metadata } from "next";
import { SiteHeader } from "@/components/QamarLogo";
import { BRAND, contactEmail } from "@/lib/brand";

export const metadata: Metadata = { title: `Confidentialité · ${BRAND.name}` };

export default function ConfidentialitePage() {
  const email = contactEmail();
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-12 leading-relaxed">
        <div className="flex flex-col gap-2">
          <p className="label-mono">Dernière mise à jour · novembre 2026</p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Politique de confidentialité<span className="text-accent">.</span>
          </h1>
        </div>

        <Block title="Qui sommes-nous">
          {BRAND.name} (édité par {BRAND.company}) fournit aux commerçants des cartes de fidélité pour Apple Wallet et Google Wallet, et
          l&apos;application de caisse qui va avec. Contact : {email ?? "adresse de contact à venir"}.
        </Block>

        <Block title="Données des commerçants et de leur équipe">
          Nom du commerce, nom et adresse e-mail des membres de l&apos;équipe, code PIN (enregistré sous forme chiffrée, jamais en clair),
          réglages de la carte (couleurs, logo, texte), adresses des boutiques si vous les ajoutez, et informations d&apos;abonnement
          traitées par notre prestataire de paiement Stripe. Nous ne voyons jamais votre numéro de carte bancaire.
        </Block>

        <Block title="Données des clients des commerçants">
          Prénom, et selon les choix du commerçant : e-mail, téléphone, date d&apos;anniversaire ; historique des passages en caisse
          (tampons, points, récompenses). Le commerçant est responsable de ces données ; {BRAND.name} les traite pour son compte
          (sous-traitant au sens de l&apos;article 28 du RGPD).
        </Block>

        <Block title="Appareil photo, photos et position">
          L&apos;appareil photo sert uniquement à lire le QR code des cartes en caisse ; aucune image n&apos;est enregistrée. La photothèque
          sert uniquement à choisir le logo du commerce. La position n&apos;est demandée que lorsque vous enregistrez l&apos;emplacement
          de votre boutique ; elle n&apos;est pas suivie en arrière-plan.
        </Block>

        <Block title="Ce que nous ne faisons pas">
          Pas de publicité, pas de revente de données, pas de traceur publicitaire dans l&apos;application, pas de suivi entre
          applications.
        </Block>

        <Block title="Hébergement et durée de conservation">
          Les données sont hébergées dans l&apos;Union européenne. Elles sont conservées tant que le compte existe, et effacées dès sa suppression.
          Les factures sont conservées le temps imposé par la loi.
        </Block>

        <Block title="Vos droits et la suppression du compte">
          Le responsable du commerce peut supprimer son compte à tout moment depuis l&apos;application (Profil › Supprimer mon
          compte) : l&apos;abonnement s&apos;arrête et toutes les données du commerce sont effacées. Un vendeur peut supprimer son
          propre accès de la même façon. Un client peut demander l&apos;effacement de sa carte au
          commerçant ou en nous écrivant. Vous pouvez aussi saisir la CNIL (cnil.fr).
        </Block>
      </main>
    </>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-muted">{children}</p>
    </section>
  );
}
