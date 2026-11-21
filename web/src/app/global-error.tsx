"use client";
// Dernier filet : erreur dans le layout lui-même. Styles en ligne (la feuille de style peut manquer).
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", background: "#0b0b0d", color: "#f5f3ef", fontFamily: "system-ui, sans-serif" }}>
        <main style={{ maxWidth: 420, padding: 24 }}>
          <h1 style={{ fontSize: 28, margin: "0 0 12px" }}>Quelque chose s&apos;est mal passé.</h1>
          <p style={{ color: "#9a958f", margin: "0 0 24px" }}>Le site rencontre un problème. Réessayez dans un instant.</p>
          <button onClick={reset} style={{ background: "#FC4F00", color: "#0b0b0d", border: 0, borderRadius: 16, padding: "14px 20px", fontWeight: 700, cursor: "pointer" }}>
            Réessayer
          </button>
        </main>
      </body>
    </html>
  );
}
