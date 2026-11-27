// Mentions légales (loi pour la confiance dans l'économie numérique, article 6).
// Les informations de la société viennent des variables LEGAL_* (voir lib/brand.ts).
import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { Block, LegalPage } from "@/components/Legal";
import { BRAND, legalInfo } from "@/lib/brand";

export const metadata: Metadata = { title: `Mentions légales · ${BRAND.name}` };

export default function MentionsLegalesPage() {
  return (
    <LegalPage title="Mentions légales" updated="27 novembre 2026">
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
      <Block title="Éditeur">
        <p>
          Le service {BRAND.name} est édité par {l.company}, {l.form}, immatriculée sous le numéro {l.siren}, TVA intracommunautaire{" "}
          {l.vat}. Siège : {l.address}. Contact : {l.email}.
        </p>
        <p>Directeur de la publication : {l.director}.</p>
      </Block>
      <Block title="Hébergement">
        <p>
          Site et serveur : Render Services, Inc., 525 Brannan Street, Suite 300, San Francisco, CA 94107, États-Unis (render.com).
          Les serveurs utilisés sont situés à Francfort (Allemagne).
        </p>
        <p>Base de données : Supabase, Inc. (supabase.com), serveurs situés dans l&apos;Union européenne.</p>
      </Block>
      <Block title="Propriété intellectuelle">
        <p>
          Le nom, le logo, les textes et le logiciel {BRAND.name} appartiennent à {l.company}. Les logos et contenus des commerces restent
          la propriété de chaque commerçant.
        </p>
      </Block>
    </>
  );
}
