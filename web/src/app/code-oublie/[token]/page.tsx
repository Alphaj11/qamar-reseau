// Lien reçu par e-mail : choix du nouveau code (valable 30 minutes, une seule fois).
import { Suspense } from "react";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/QamarLogo";
import { PageSkeleton } from "@/components/PageSkeleton";
import { pinResetValid } from "@/lib/pin-reset";
import { Expired, ResetForm } from "../Forms";

export const metadata: Metadata = { title: "Nouveau code", robots: { index: false }, referrer: "no-referrer" };

export default function NewPinPage({ params }: PageProps<"/code-oublie/[token]">) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-12">
        <h1 className="text-3xl font-bold tracking-tight">
          Nouveau code<span className="text-accent">.</span>
        </h1>
        <Suspense fallback={<PageSkeleton />}>
          <Body params={params} />
        </Suspense>
      </main>
    </>
  );
}

async function Body({ params }: { params: PageProps<"/code-oublie/[token]">["params"] }) {
  const { token } = await params;
  return (await pinResetValid(token)) ? <ResetForm token={token} /> : <Expired />;
}
