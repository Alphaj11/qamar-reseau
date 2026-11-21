// Logo Qamar : Q en pixels orange sur parallélogramme (repris de qamar-conception.fr).
const PIXELS = [
  [36.6, 16, 16.8, 5.6],
  [31, 21.6, 5.6, 16.8],
  [53.4, 21.6, 5.6, 11.2],
  [47.8, 38.4, 5.6, 5.6],
  [36.6, 44, 11.2, 5.6],
  [53.4, 44, 5.6, 5.6],
] as const;

export function QamarMark({ width = 40, className }: { width?: number; className?: string }) {
  return (
    <svg width={width} height={(width * 66) / 96} viewBox="-3 -3 96 66" role="img" aria-label="Qamar" className={className}>
      <polygon points="26,0 90,0 64,60 0,60" fill="#141416" stroke="#141416" strokeWidth="4" strokeLinejoin="round" />
      <polygon points="26,0 90,0 64,60 0,60" fill="none" stroke="#ffffff" strokeOpacity=".14" strokeWidth=".8" strokeLinejoin="round" />
      <g fill="#FC4F00">
        {PIXELS.map(([x, y, w, h]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width={w} height={h} />
        ))}
      </g>
    </svg>
  );
}

export function QamarLogo({ href = "/" }: { href?: string }) {
  return (
    <a href={href} className="inline-flex items-center gap-2.5" aria-label="Qamar Réseaux, accueil">
      <QamarMark width={40} />
      <span className="flex flex-col leading-none">
        <span className="text-lg font-bold tracking-tight">Qamar</span>
        <span className="label-mono mt-1 text-[0.625rem] text-muted">Réseaux</span>
      </span>
    </a>
  );
}

/** Barre du haut des pages commerçant. */
export function SiteHeader() {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4">
        <QamarLogo />
        <span className="label-mono hidden text-muted sm:inline">Fidélité Apple &amp; Google Wallet</span>
      </div>
    </header>
  );
}

/** Mention discrète en bas des pages vues par les clients du commerce. */
export function PoweredBy() {
  return (
    <p className="mt-auto flex items-center justify-center gap-2 pb-6 pt-10 text-xs text-muted">
      <QamarMark width={22} />
      <span>Carte de fidélité par Qamar Réseaux</span>
    </p>
  );
}
