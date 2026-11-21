// Placeholder affiché pendant le chargement des données (streaming).
export function PageSkeleton() {
  return (
    <main className="mx-auto w-full max-w-md px-4 py-8 flex flex-col gap-6" aria-busy="true">
      <div className="h-7 w-2/3 rounded-md bg-surface-2" />
      <div className="h-4 w-full rounded-md bg-surface-2" />
      <div className="mx-auto h-56 w-full max-w-[360px] rounded-2xl bg-surface-2" />
    </main>
  );
}
