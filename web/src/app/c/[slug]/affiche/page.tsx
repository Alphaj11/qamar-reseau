// Affiche à imprimer (A5 / A4) : le QR code d'inscription, à poser en caisse ou en vitrine.
import { Suspense } from "react";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { getProgramBySlug } from "@/lib/db";
import { publicUrl } from "@/lib/wallet/config";
import { PageSkeleton } from "@/components/PageSkeleton";
import { PrintButton } from "./PrintButton";

export default function PosterPage({ params }: PageProps<"/c/[slug]/affiche">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Poster params={params} />
    </Suspense>
  );
}

async function Poster({ params }: { params: PageProps<"/c/[slug]/affiche">["params"] }) {
  const { slug } = await params;
  const program = await getProgramBySlug(slug);
  if (!program) notFound();
  const url = `${publicUrl()}/c/${program.slug}`;
  const qr = await QRCode.toDataURL(url, { width: 640, margin: 1, errorCorrectionLevel: "M" });
  const goal = program.type === "stamps" ? `${program.stampsRequired} tampons` : `${program.pointsRequired} points`;

  return (
    <main className="flex min-h-full flex-col items-center gap-6 px-4 py-8 print:p-0">
      <article
        className="flex aspect-[1/1.414] w-full max-w-md flex-col items-center justify-between rounded-3xl p-8 text-center print:max-w-none print:rounded-none"
        style={{ background: program.bgColor, color: program.fgColor }}
      >
        <header className="flex flex-col gap-2">
          <p className="text-lg font-semibold">{program.merchantName}</p>
          <h1 className="text-3xl font-bold leading-tight">Votre carte de fidélité dans votre téléphone</h1>
        </header>
        {/* eslint-disable-next-line @next/next/no-img-element -- image générée, pas besoin d'optimisation */}
        <img src={qr} alt={`QR code vers ${url}`} className="w-3/5 rounded-2xl bg-white p-3" />
        <footer className="flex flex-col gap-2">
          <p className="text-xl font-semibold" style={{ color: program.accentColor }}>
            {program.rewardLabel} au bout de {goal}
          </p>
          <p className="text-sm opacity-80">Scannez avec l&apos;appareil photo · Rien à installer · Apple Wallet et Google Wallet</p>
        </footer>
      </article>
      <div className="flex flex-col items-center gap-2 print:hidden">
        <PrintButton />
        <p className="text-xs text-muted">{url}</p>
      </div>
    </main>
  );
}
