// Conditions générales de vente aux commerçants (contrat entre professionnels).
// Base de travail fidèle au fonctionnement réel du service : à faire relire par un juriste.
import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { Block, LegalPage } from "@/components/Legal";
import { BRAND, legalInfo } from "@/lib/brand";
import { PLANS, TRIAL_DAYS } from "@/lib/subscription";

export const metadata: Metadata = { title: `CGV · ${BRAND.name}` };

export default function CgvPage() {
  return (
    <LegalPage title="Conditions générales de vente" updated="27 novembre 2026">
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
      <Block title="1. Objet">
        <p>
          Ces conditions régissent l&apos;abonnement au service {BRAND.name}, édité par {l.company} (« Qamar »), par un professionnel
          (« le Commerçant »). Le service permet de créer des cartes de fidélité pour Apple Wallet et Google Wallet, de les tamponner
          avec l&apos;application de caisse, et d&apos;envoyer des messages aux clients qui l&apos;acceptent. Le service est réservé aux
          professionnels : le Commerçant agit pour les besoins de son activité.
        </p>
      </Block>
      <Block title="2. Compte et accès">
        <p>
          Le Commerçant crée son compte sur le site et choisit un code de connexion personnel, qu&apos;il garde secret. Il est
          responsable des accès qu&apos;il donne à son équipe depuis l&apos;application. L&apos;accès au service est ouvert dès la
          confirmation du paiement par notre prestataire Stripe.
        </p>
      </Block>
      <Block title="3. Prix et paiement">
        <p>
          {PLANS.monthly.name} : {PLANS.monthly.label} ({PLANS.monthly.ttc}). {PLANS.yearly.name} : {PLANS.yearly.label} ({PLANS.yearly.ttc}).
          Les prix sont payables d&apos;avance par carte bancaire, par prélèvement automatique à chaque échéance, via Stripe. Qamar ne voit
          jamais le numéro de carte. Une facture est disponible à chaque paiement dans l&apos;espace de facturation.
        </p>
        {TRIAL_DAYS > 0 && (
          <p>
            Le premier abonnement commence par un essai gratuit de {TRIAL_DAYS} jours. Le premier prélèvement a lieu à la fin de
            l&apos;essai, sauf résiliation avant cette date. L&apos;essai n&apos;est accordé qu&apos;une fois par commerce.
          </p>
        )}
        <p>
          En cas d&apos;échec de paiement, Stripe retente le prélèvement pendant quelques jours ; sans régularisation, l&apos;abonnement
          est suspendu. Qamar peut modifier ses prix pour l&apos;avenir en prévenant le Commerçant au moins 30 jours avant ; le
          Commerçant peut alors résilier avant l&apos;entrée en vigueur du nouveau prix.
        </p>
      </Block>
      <Block title="4. Durée et résiliation">
        <p>
          L&apos;abonnement est sans engagement au-delà de la période payée et se renouvelle automatiquement (chaque mois ou chaque
          année). Le Commerçant peut le résilier à tout moment depuis l&apos;espace de facturation, ou en supprimant son compte dans
          l&apos;application : le service reste ouvert jusqu&apos;à la fin de la période déjà payée, sans remboursement au prorata.
        </p>
        <p>
          Qamar peut suspendre ou résilier un compte en cas de non-paiement, d&apos;usage contraire à la loi ou à ces conditions
          (notamment l&apos;envoi de messages non sollicités), après une mise en demeure restée sans effet pendant 8 jours, sauf
          urgence.
        </p>
      </Block>
      <Block title="5. Obligations du Commerçant">
        <p>
          Le Commerçant fixe lui-même les règles de son programme de fidélité (récompenses, nombre de passages, messages) et les
          honore auprès de ses clients. Il garantit avoir les droits sur le logo, les images et les textes qu&apos;il met sur sa carte. Il
          n&apos;envoie de messages promotionnels qu&apos;aux clients qui l&apos;ont accepté, ce que l&apos;application vérifie.
        </p>
      </Block>
      <Block title="6. Données personnelles des clients du Commerçant">
        <p>
          Pour les données de ses clients (prénom, coordonnées facultatives, passages en caisse), le Commerçant est responsable de
          traitement et Qamar est son sous-traitant au sens de l&apos;article 28 du RGPD. Qamar s&apos;engage à :
        </p>
        <ul className="list-disc pl-5">
          <li>ne traiter ces données que pour fournir le service, sur instruction du Commerçant ;</li>
          <li>en garder la confidentialité et les protéger (chiffrement des échanges, accès limités, codes enregistrés sous forme chiffrée) ;</li>
          <li>
            ne faire appel qu&apos;aux sous-traitants nécessaires au service, listés dans la politique de confidentialité (hébergement,
            base de données, paiement, Apple et Google pour les cartes Wallet, envoi d&apos;e-mails), et prévenir le Commerçant de tout
            changement ;
          </li>
          <li>aider le Commerçant à répondre aux demandes de ses clients (accès, effacement) ;</li>
          <li>le prévenir sans délai excessif de toute violation de données le concernant ;</li>
          <li>effacer toutes les données du commerce à la suppression du compte.</li>
        </ul>
      </Block>
      <Block title="7. Disponibilité du service">
        <p>
          Qamar fait ses meilleurs efforts pour que le service soit disponible en continu (obligation de moyens). Il peut être
          interrompu pour maintenance, si possible en dehors des heures d&apos;ouverture. L&apos;application de caisse continue de
          tamponner sans connexion et envoie les passages au retour du réseau. Le fonctionnement des cartes dépend aussi d&apos;Apple
          et de Google, sur lesquels Qamar n&apos;a pas la main.
        </p>
      </Block>
      <Block title="8. Responsabilité">
        <p>
          Qamar n&apos;est responsable que des dommages directs prouvés causés par un manquement à ses obligations. Sa responsabilité
          totale est limitée aux sommes payées par le Commerçant pendant les 12 mois précédant le fait générateur. Qamar n&apos;est pas
          responsable des promesses faites par le Commerçant à ses clients, ni des pertes indirectes (chiffre d&apos;affaires, clientèle).
        </p>
      </Block>
      <Block title="9. Propriété">
        <p>
          Le logiciel reste la propriété de Qamar ; l&apos;abonnement donne un droit d&apos;utilisation personnel pendant sa durée. Les
          contenus du Commerçant et les données de ses clients restent les siens : il peut les exporter à tout moment (Excel, CSV, PDF).
        </p>
      </Block>
      <Block title="10. Modification, droit applicable">
        <p>
          Qamar peut faire évoluer ces conditions ; le Commerçant est prévenu au moins 30 jours avant toute modification importante et
          peut résilier s&apos;il la refuse. Ces conditions sont soumises au droit français. En cas de litige, après une tentative de
          règlement amiable, le tribunal de commerce de {l.city} est seul compétent.
        </p>
      </Block>
      <Block title="Contact">
        <p>
          {l.company}, {l.address}. {l.email}.
        </p>
      </Block>
    </>
  );
}
