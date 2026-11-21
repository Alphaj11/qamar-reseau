// Page 404 : adresse inconnue, carte ou commerce supprimé.
import Link from "next/link";
import { QamarMark } from "@/components/QamarLogo";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-5 px-4 py-16">
      <QamarMark width={52} />
      <p className="label-mono text-accent">Erreur 404</p>
      <h1 className="text-3xl font-bold tracking-tight">Cette page n&apos;existe pas (ou plus).</h1>
      <p className="text-muted">
        Si vous avez scanné un QR code en boutique, demandez au commerçant de vous montrer le nouveau.
      </p>
      <Link href="/" className="btn-qamar w-fit">
        Retour à l&apos;accueil
      </Link>
    </main>
  );
}
