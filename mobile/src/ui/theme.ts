// Univers Qamar, version lumineuse : fond crème, encre nuit, orange #FC4F00 pour l'action.
// Le noir Qamar reste présent sur les éléments forts (barre d'onglets, carte « Aujourd'hui », écran Scan).

const qamar = {
  /** Fond de l'appli (crème chaude). */
  bg: "#f4f2ee",
  /** Cartes et panneaux. */
  surface: "#ffffff",
  /** Éléments posés sur une carte : pastilles d'icônes, champs. */
  surface2: "#f0ede8",
  text: "#0d0d0f",
  muted: "#6f6a63",
  line: "rgba(13,13,15,0.08)",
  /** Orange Qamar : l'action principale de l'écran. */
  primary: "#FC4F00",
  onPrimary: "#ffffff",
  accent: "#FC4F00",
  accentLight: "#ff8a4a",
  accentSoft: "rgba(252,79,0,0.10)",
  /** Nuit Qamar : sélection, barre d'onglets, cartes fortes. */
  inverse: "#0d0d0f",
  onInverse: "#f5f3ef",
  night: "#0b0b0d",
  night2: "#1c1c1f",
  nightMuted: "#9a958f",
  nightLine: "rgba(255,255,255,0.10)",
  ok: "#16915a",
  okSoft: "rgba(22,145,90,0.10)",
  warn: "#b97400",
  warnSoft: "rgba(201,133,0,0.12)",
  danger: "#d2382a",
  dangerSoft: "rgba(210,56,42,0.10)",
  neutralSoft: "rgba(13,13,15,0.05)",
};

export type Palette = typeof qamar;

export function usePalette(): Palette {
  return qamar;
}

export const palette = qamar;

/** Échelle de texte (styles de la maquette). `fontFamily: "mono"` → Geist Mono. */
export const type = {
  display: { fontSize: 34, fontWeight: "700", letterSpacing: -1.2, lineHeight: 38 },
  titleL: { fontSize: 28, fontWeight: "700", letterSpacing: -0.8, lineHeight: 32 },
  titleM: { fontSize: 20, fontWeight: "600", letterSpacing: -0.3 },
  titleS: { fontSize: 16, fontWeight: "600" },
  body: { fontSize: 16, fontWeight: "400" },
  bodyS: { fontSize: 14, fontWeight: "400" },
  figure: { fontSize: 30, fontWeight: "600", letterSpacing: -0.8 },
  label: { fontSize: 11, fontWeight: "500", letterSpacing: 1.2, textTransform: "uppercase", fontFamily: "mono" },
  button: { fontSize: 13, fontWeight: "600", letterSpacing: 1, textTransform: "uppercase", fontFamily: "mono" },
  small: { fontSize: 12, fontWeight: "400", fontFamily: "mono" },
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 10, md: 16, lg: 22, xl: 28 } as const;

/** Ombre douce des cartes (iOS / web ; Android : elevation). */
export const shadow = {
  shadowColor: "#2a1a0a",
  shadowOpacity: 0.06,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 6 },
  elevation: 2,
} as const;

/** Hauteur réservée en bas des écrans pour la barre d'onglets flottante. */
export const TAB_BAR_SPACE = 112;
