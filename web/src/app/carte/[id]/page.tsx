// Page affichée après l'inscription : la carte du client + boutons d'ajout au Wallet.
import { Suspense } from "react";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { getCardWithProgram } from "@/lib/db";
import { WalletCard } from "@/components/WalletCard";
import { PageSkeleton } from "@/components/PageSkeleton";
import { WalletButtons } from "@/components/WalletButtons";

export default function CardPage({ params }: PageProps<"/carte/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CardView params={params} />
    </Suspense>
  );
}

async function CardView({ params }: { params: PageProps<"/carte/[id]">["params"] }) {
  const { id } = await params;
  const data = await getCardWithProgram(id);
  if (!data) notFound();
  const { card, program, customer } = data;

  const value = program.type === "stamps" ? card.stamps : card.points;
  // Le QR contient le numéro de série : c'est lui que l'appli commerçant scanne.
  const qr = await QRCode.toDataURL(card.serial, { margin: 0, width: 300 });

  return (
    <main className="mx-auto w-full max-w-md px-4 py-8 flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="label-mono text-muted">{program.merchantName}</p>
        <h1 className="text-3xl font-bold tracking-tight">Bienvenue {customer.firstName} !</h1>
        <p className="text-muted">
          Ajoutez votre carte à votre téléphone pour la retrouver à chaque passage chez{" "}
          {program.merchantName}.
        </p>
      </header>

      <WalletButtons cardId={card.id} />

      <div className="flex justify-center">
        <WalletCard
          program={program}
          value={value}
          holder={customer.firstName}
          qrDataUrl={qr}
          serial={card.serial}
        />
      </div>

      <p className="text-sm text-muted text-center">
        Pas de Wallet sur votre téléphone ? Gardez cette page dans vos favoris et présentez ce QR code en caisse.
      </p>
    </main>
  );
}
