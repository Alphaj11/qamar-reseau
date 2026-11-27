// « Code oublié » : demande d'un lien de réinitialisation par e-mail.
import type { Metadata } from "next";
import { SiteHeader } from "@/components/QamarLogo";
import { RequestForm } from "./Forms";

export const metadata: Metadata = { title: "Code oublié", robots: { index: false } };

export default function CodeOubliePage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-12">
        <h1 className="text-3xl font-bold tracking-tight">
          Code oublié<span className="text-accent">.</span>
        </h1>
        <p className="text-muted">Indiquez l&apos;e-mail de votre compte : nous vous envoyons un lien pour choisir un nouveau code.</p>
        <RequestForm />
      </main>
    </>
  );
}
