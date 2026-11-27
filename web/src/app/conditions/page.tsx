// Conditions générales d'utilisation : pour les clients des commerces (porteurs de cartes) et tout visiteur du site.
// Les commerçants sont aussi liés par les CGV. À faire relire par un juriste.
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Block, LegalPage } from "@/components/Legal";
import { BRAND, legalInfo } from "@/lib/brand";

export const metadata: Metadata = { title: `Conditions d'utilisation · ${BRAND.name}` };

export default function ConditionsPage() {
  return (
    <LegalPage title="Conditions d'utilisation" updated="27 novembre 2026">
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
      <Block title="1. Le service">
        <p>
          {BRAND.name} permet aux commerces partenaires de proposer une carte de fidélité à enregistrer dans Apple Wallet ou Google
          Wallet. Pour vous, client d&apos;un commerce, la carte est gratuite et sans obligation d&apos;achat. Ces conditions
          s&apos;appliquent à toute personne qui crée une carte ou visite ce site. Les commerçants sont en plus liés par les{" "}
          <Link href="/cgv" className="underline decoration-accent underline-offset-2">
            conditions générales de vente
          </Link>
          .
        </p>
      </Block>
      <Block title="2. Votre carte">
        <p>
          Vous créez votre carte en scannant le QR code du commerce et en indiquant au minimum un prénom. La carte est propre à ce
          commerce. Le lien de votre carte est personnel : ne le partagez pas, il permet de l&apos;ajouter à un téléphone.
        </p>
        <p>
          Les règles du programme (nombre de passages, récompenses, durée) sont fixées par le commerce, qui est seul responsable de les
          appliquer et de remettre les récompenses. Le commerce peut changer ou arrêter son programme ; une récompense déjà gagnée
          reste à faire valoir auprès de lui.
        </p>
      </Block>
      <Block title="3. Messages">
        <p>
          Si vous l&apos;acceptez à l&apos;inscription, le commerce peut vous envoyer des offres sous forme de notification sur la
          carte. Vous pouvez désactiver les notifications à tout moment dans les réglages de la carte dans Wallet, ou supprimer la carte.
        </p>
      </Block>
      <Block title="4. Usage correct">
        <p>
          Il est interdit de créer des cartes avec l&apos;identité d&apos;autrui, de tenter d&apos;obtenir des tampons ou des
          récompenses par fraude, de chercher à accéder aux comptes ou aux données d&apos;autres personnes, ou de perturber le
          fonctionnement du service. Une carte utilisée de façon frauduleuse peut être supprimée.
        </p>
      </Block>
      <Block title="5. Disponibilité et responsabilité">
        <p>
          Nous faisons de notre mieux pour que le service fonctionne en continu, sans pouvoir le garantir : il peut être interrompu
          pour maintenance, et dépend aussi d&apos;Apple et de Google. {l.company} n&apos;est pas partie à la relation entre vous et le
          commerce, et ne répond pas des offres ou récompenses promises par celui-ci.
        </p>
      </Block>
      <Block title="6. Données personnelles">
        <p>
          Vos données sont traitées comme expliqué dans la{" "}
          <Link href="/confidentialite" className="underline decoration-accent underline-offset-2">
            politique de confidentialité
          </Link>
          . Pour supprimer votre carte et vos données, adressez-vous au commerce ou écrivez-nous.
        </p>
      </Block>
      <Block title="7. Droit applicable">
        <p>
          Ces conditions sont soumises au droit français. Si vous êtes consommateur, vous gardez la protection des règles de votre
          pays de résidence et pouvez saisir le tribunal de votre domicile. Contact : {l.email}.
        </p>
      </Block>
    </>
  );
}
