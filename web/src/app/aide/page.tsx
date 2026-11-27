// Page d'aide (« URL d'assistance » demandée par l'App Store).
import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/QamarLogo";
import { BRAND, contactEmail } from "@/lib/brand";

export const metadata: Metadata = { title: `Aide · ${BRAND.name}` };

const FAQ: [string, string][] = [
  ["Comment mes clients obtiennent-ils la carte ?", "Ils scannent votre QR code d'inscription (onglet Carte › QR code), saisissent leur prénom et ajoutent la carte à Apple Wallet ou Google Wallet. Aucune application à installer."],
  ["Comment ajouter un tampon ?", "Onglet Scanner : visez le QR code affiché sur la carte du client, puis validez. Sans réseau, le passage est gardé sur le téléphone et envoyé dès le retour de la connexion."],
  ["Comment changer le design de ma carte ?", "Onglet Carte › Apparence : choisissez un modèle par métier, votre logo, vos couleurs et le pictogramme. Les cartes déjà installées se mettent à jour automatiquement."],
  ["J'ai oublié mon code PIN", "Touchez « Code oublié ? » sur l'écran de connexion, ou ouvrez /code-oublie : vous recevez par e-mail un lien valable 30 minutes pour choisir un nouveau code. Le responsable peut aussi retirer puis réinviter un vendeur depuis Profil › Équipe."],
  ["Comment arrêter mon abonnement ?", "Le responsable ouvre l'application sur le site, puis Profil › Factures et moyen de paiement. Vos clients et leurs tampons sont conservés : vous pourrez reprendre plus tard."],
  ["Comment supprimer mon compte ?", "Profil › Zone sensible › Supprimer mon compte. Pour le responsable, l'abonnement s'arrête et toutes les données du commerce sont effacées définitivement. Pour un vendeur, seul son accès est retiré."],
];

export default function AidePage() {
  const email = contactEmail();
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-12 leading-relaxed">
        <h1 className="text-3xl font-semibold tracking-tight">
          Aide<span className="text-accent">.</span>
        </h1>
        {FAQ.map(([q, a]) => (
          <section key={q} className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">{q}</h2>
            <p className="text-muted">{a}</p>
          </section>
        ))}
        <p className="rounded-2xl border border-line p-4">
          Une autre question ? {email ? <a className="underline decoration-accent underline-offset-2" href={`mailto:${email}`}>{email}</a> : "Écrivez-nous depuis l'application."}
        </p>
        <Link href="/confidentialite" className="label-mono underline">
          Politique de confidentialité
        </Link>
      </main>
    </>
  );
}
