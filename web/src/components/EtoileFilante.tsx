// Étoile filante décorative de l'accueil : elle entre en haut à gauche, dessine
// la boucle du Q de Qamar autour du titre, puis sort par la queue du Q.
// Masquée si l'utilisateur a demandé moins d'animations.
const TRAJET =
  "M -120 -60 Q 250 40 500 80 A 220 220 0 1 1 499.9 80 A 220 220 0 0 1 655.6 455.6 L 900 720";
const DUREE = "7s";

export function EtoileFilante() {
  return (
    <svg
      aria-hidden
      className="etoile-filante pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 1000 600"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <filter id="lueur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="flou" />
          <feMerge>
            <feMergeNode in="flou" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* Trace laissée par l'étoile : un Q qui apparaît puis s'efface. */}
      <path d={TRAJET} className="etoile-trace" fill="none" stroke="#FC4F00" strokeWidth="1.5" strokeLinecap="round" />
      {/* Traînée lumineuse qui suit l'étoile. */}
      <path d={TRAJET} className="etoile-trainee" fill="none" stroke="#FFB27A" strokeWidth="3" strokeLinecap="round" filter="url(#lueur)" />
      <g filter="url(#lueur)">
        <circle r="5" fill="#ffffff" />
        <circle r="9" fill="#FC4F00" opacity="0.45" />
        <animateMotion dur={DUREE} repeatCount="indefinite" path={TRAJET} keyPoints="0;1;1" keyTimes="0;0.6;1" calcMode="linear" />
      </g>
    </svg>
  );
}
