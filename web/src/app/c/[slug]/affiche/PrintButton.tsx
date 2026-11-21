"use client";

export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="btn-qamar">
      Imprimer l&apos;affiche
    </button>
  );
}
