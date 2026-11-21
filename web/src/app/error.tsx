"use client";
// Erreur inattendue dans une page : message humain au lieu d'un écran blanc.
import { useEffect } from "react";
import Link from "next/link";
import { QamarMark } from "@/components/QamarLogo";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Visible dans les journaux de l'hébergeur (et dans Sentry quand il sera branché)
    console.error("[page]", error.digest ?? "", error.message);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-5 px-4 py-16">
      <QamarMark width={52} />
      <h1 className="text-3xl font-bold tracking-tight">
        Quelque chose s&apos;est mal passé<span className="text-accent">.</span>
      </h1>
      <p className="text-muted">
        La page n&apos;a pas pu s&apos;afficher. Réessayez dans un instant ; si le problème continue, revenez à l&apos;accueil.
      </p>
      {error.digest && <p className="label-mono text-muted">Code : {error.digest}</p>}
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <button onClick={reset} className="btn-qamar">
          Réessayer
        </button>
        <Link href="/" className="rounded-2xl border border-line px-5 py-3 text-center font-medium hover:bg-surface">
          Retour à l&apos;accueil
        </Link>
      </div>
    </main>
  );
}
