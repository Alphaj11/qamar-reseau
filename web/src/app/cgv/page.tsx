// Conditions générales de vente : document à rédiger avec un juriste avant la mise en vente.
import { SiteHeader } from "@/components/QamarLogo";
import { BRAND } from "@/lib/brand";

export default function CgvPage() {
  return (
    <>
    <SiteHeader />
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-12">
      <h1 className="text-2xl font-semibold">Conditions générales de vente — {BRAND.name}</h1>
      <p className="rounded-xl border border-dashed border-line p-4 text-muted">
        Document en cours de rédaction. Il doit couvrir avant l&apos;ouverture : l&apos;éditeur (Qamar), le prix (25 € HT /
        mois), la durée et la résiliation, la sous-traitance des données des clients du commerçant (RGPD, article 28), la
        disponibilité du service, la responsabilité et le droit applicable.
      </p>
    </main>
    </>
  );
}
