// Mise en page commune des pages légales (confidentialité, CGV, conditions d'utilisation, mentions légales).
import Link from "next/link";
import { SiteHeader } from "./QamarLogo";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-12 leading-relaxed">
        <div className="flex flex-col gap-2">
          <p className="label-mono">Dernière mise à jour · {updated}</p>
          <h1 className="text-3xl font-semibold tracking-tight">
            {title}
            <span className="text-accent">.</span>
          </h1>
        </div>
        {children}
      </main>
    </>
  );
}

export function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="flex flex-col gap-2 text-muted">{children}</div>
    </section>
  );
}

/** Liens légaux en bas de toutes les pages. */
export function SiteFooter() {
  const links: [string, string][] = [
    ["/mentions-legales", "Mentions légales"],
    ["/cgv", "CGV"],
    ["/conditions", "Conditions d'utilisation"],
    ["/confidentialite", "Confidentialité et cookies"],
    ["/aide", "Aide"],
  ];
  return (
    <footer className="mt-auto border-t border-line">
      <nav className="mx-auto flex w-full max-w-5xl flex-wrap justify-center gap-x-5 gap-y-2 px-4 py-5 text-xs text-muted">
        {links.map(([href, label]) => (
          <Link key={href} href={href} className="hover:text-foreground">
            {label}
          </Link>
        ))}
      </nav>
    </footer>
  );
}
