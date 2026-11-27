// Politique de confidentialité et cookies (exigée par l'App Store et le RGPD).
// Rédigée d'après ce que fait réellement l'application ; à faire relire avant l'ouverture.
// Cookies : le site n'en dépose aucun (pas de mesure d'audience, pas de publicité, connexion par jeton dans l'appli),
// d'où l'absence de bandeau. Si un outil de mesure ou de publicité est ajouté, il faudra un bandeau de consentement.
import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { Block, LegalPage } from "@/components/Legal";
import { BRAND, legalInfo } from "@/lib/brand";

export const metadata: Metadata = { title: `Confidentialité · ${BRAND.name}` };

export default function ConfidentialitePage() {
  return (
    <LegalPage title="Politique de confidentialité" updated="27 novembre 2026">
      <Suspense>
        <Content />
      </Suspense>
    </LegalPage>
  );
}

async function Content() {
  await connection();
  const l = legalInfo();
  return (
    <>
      <Block title="Qui sommes-nous">
        <p>
          {BRAND.name} (édité par {l.company}, {l.address}) fournit aux commerçants des cartes de fidélité pour Apple Wallet et Google
          Wallet, et l&apos;application de caisse qui va avec. Contact pour toute question sur vos données : {l.email}.
        </p>
      </Block>

      <Block title="Données des commerçants et de leur équipe">
        <p>
          Nom du commerce, nom et adresse e-mail des membres de l&apos;équipe, code de connexion (enregistré sous forme chiffrée, jamais
          en clair), réglages de la carte (couleurs, logo, texte), adresses des boutiques si vous les ajoutez, et informations
          d&apos;abonnement traitées par Stripe. Nous ne voyons jamais votre numéro de carte bancaire. Responsable de traitement :{" "}
          {l.company}. Base légale : l&apos;exécution du contrat d&apos;abonnement, et nos obligations comptables pour les factures.
        </p>
      </Block>

      <Block title="Données des clients des commerçants">
        <p>
          Prénom, et selon les choix du commerçant : e-mail, téléphone, jour et mois d&apos;anniversaire ; historique des passages en
          caisse (tampons, points, récompenses) ; accord ou non pour recevoir des offres. Le commerçant est responsable de ces données ;{" "}
          {BRAND.name} les traite pour son compte (sous-traitant au sens de l&apos;article 28 du RGPD). Les offres ne sont envoyées
          qu&apos;aux clients qui l&apos;ont accepté.
        </p>
      </Block>

      <Block title="Appareil photo, photos et position">
        <p>
          L&apos;appareil photo sert uniquement à lire le QR code des cartes en caisse ; aucune image n&apos;est enregistrée. La
          photothèque sert uniquement à choisir le logo ou la bannière du commerce. La position n&apos;est demandée que lorsque vous
          enregistrez l&apos;emplacement de votre boutique ; elle n&apos;est pas suivie en arrière-plan.
        </p>
      </Block>

      <Block title="Cookies">
        <p>
          Ce site ne dépose aucun cookie : pas de mesure d&apos;audience, pas de publicité, pas de bouton de réseau social. La
          connexion à l&apos;application de caisse utilise un jeton gardé dans l&apos;application, pas un cookie. C&apos;est pour cela
          qu&apos;aucun bandeau ne vous demande votre accord. La page de paiement est celle de Stripe (stripe.com), qui dépose ses
          propres cookies nécessaires à la sécurité du paiement.
        </p>
      </Block>

      <Block title="Ce que nous ne faisons pas">
        <p>Pas de publicité, pas de revente de données, pas de traceur publicitaire, pas de suivi entre applications ou sites.</p>
      </Block>

      <Block title="Nos prestataires (sous-traitants)">
        <ul className="list-disc pl-5">
          <li>Render (hébergement du site et du serveur), serveurs à Francfort, Allemagne ;</li>
          <li>Supabase (base de données), serveurs dans l&apos;Union européenne ;</li>
          <li>Stripe (paiement et facturation des commerçants) ;</li>
          <li>Apple et Google (affichage et mise à jour des cartes dans Wallet) ;</li>
          <li>Resend (envoi des e-mails de réinitialisation du code).</li>
        </ul>
        <p>
          Certains de ces prestataires sont des sociétés américaines : les transferts éventuels hors de l&apos;Union européenne sont
          encadrés par les clauses contractuelles types de la Commission européenne ou le cadre de protection des données UE-États-Unis.
        </p>
      </Block>

      <Block title="Sécurité">
        <p>
          Échanges chiffrés (HTTPS), codes de connexion enregistrés sous forme chiffrée, blocage après plusieurs codes faux, liens de
          réinitialisation valables 30 minutes et une seule fois, accès à la base réservé au serveur.
        </p>
      </Block>

      <Block title="Durée de conservation">
        <p>
          Les données sont conservées tant que le compte du commerce existe, et effacées dès sa suppression. Une carte client peut être
          effacée à tout moment par le commerçant. Les factures sont conservées 10 ans, comme l&apos;impose la loi.
        </p>
      </Block>

      <Block title="Vos droits">
        <p>
          Vous pouvez demander l&apos;accès à vos données, leur rectification, leur effacement, leur portabilité, ou vous opposer à
          leur utilisation. Le responsable du commerce peut supprimer son compte à tout moment depuis l&apos;application (Profil ›
          Supprimer mon compte) : l&apos;abonnement s&apos;arrête et toutes les données du commerce sont effacées. Un vendeur peut
          supprimer son propre accès de la même façon. Un client peut demander l&apos;effacement de sa carte au commerçant ou en nous
          écrivant à {l.email}. Vous pouvez aussi saisir la CNIL (cnil.fr).
        </p>
      </Block>
    </>
  );
}
