// Page de démonstration (développement) : les programmes et leur QR d'inscription.
import { Suspense } from "react";
import Link from "next/link";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { BRAND } from "@/lib/brand";
import { listPrograms } from "@/lib/db";
import { WalletCard } from "@/components/WalletCard";
import { PageSkeleton } from "@/components/PageSkeleton";
import { SiteHeader } from "@/components/QamarLogo";

export default function Home() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Demo />
    </Suspense>
  );
}

async function Demo() {
  const programs = await listPrograms();
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;

  const items = await Promise.all(
    programs.map(async (p) => ({
      program: p,
      url: `${origin}/c/${p.slug}`,
      qr: await QRCode.toDataURL(`${origin}/c/${p.slug}`, { margin: 1, width: 240 }),
    })),
  );

  return (
    <>
    <SiteHeader />
    <main className="mx-auto w-full max-w-5xl px-4 py-10 flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <p className="label-mono text-muted">Démo</p>
        <h1 className="text-3xl font-bold tracking-tight">{BRAND.name}<span className="text-accent">.</span></h1>
        <p className="text-muted">
          Programmes de test. Scannez un QR avec votre téléphone (même Wi-Fi) ou cliquez sur le lien.
        </p>
      </header>

      <div className="grid gap-8 md:grid-cols-2">
        {items.map(({ program, url, qr }) => (
          <section
            key={program.id}
            className="rounded-3xl border border-line bg-surface p-5 flex flex-col gap-5"
          >
            <WalletCard
              program={program}
              value={program.type === "stamps" ? 6 : 120}
              holder="Exemple"
            />
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt={`QR d'inscription ${program.merchantName}`} width={96} height={96} className="rounded" />
              <div className="min-w-0">
                <p className="font-medium">{program.merchantName}</p>
                <p className="text-sm text-muted">
                  {program.type === "stamps" ? "Tampons" : "Points"} · {program.rewardLabel}
                </p>
                <Link href={`/c/${program.slug}`} className="text-sm underline decoration-accent underline-offset-2 break-all">
                  {url}
                </Link>
              </div>
            </div>
          </section>
        ))}
      </div>
    </main>
    </>
  );
}
