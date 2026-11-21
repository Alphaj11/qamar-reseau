// Logo Qamar : le Q en pixels orange sur le parallélogramme (repris de qamar-conception.fr).
import Svg, { Polygon, Rect } from "react-native-svg";
import { View } from "react-native";
import { Text } from "./text";
import { palette } from "./theme";

const PIXELS = [
  [36.6, 16, 16.8, 5.6],
  [31, 21.6, 5.6, 16.8],
  [53.4, 21.6, 5.6, 11.2],
  [47.8, 38.4, 5.6, 5.6],
  [36.6, 44, 11.2, 5.6],
  [53.4, 44, 5.6, 5.6],
] as const;

/** Symbole seul. `width` en points ; la hauteur suit (rapport 96 × 66). */
export function QamarMark({ width = 48, plate = palette.surface }: { width?: number; plate?: string }) {
  return (
    <Svg width={width} height={(width * 66) / 96} viewBox="-3 -3 96 66" accessibilityLabel="Qamar">
      <Polygon points="26,0 90,0 64,60 0,60" fill={plate} stroke={plate} strokeWidth={4} strokeLinejoin="round" />
      <Polygon
        points="26,0 90,0 64,60 0,60"
        fill="none"
        stroke="#ffffff"
        strokeOpacity={0.14}
        strokeWidth={0.8}
        strokeLinejoin="round"
      />
      {PIXELS.map(([x, y, w, h]) => (
        <Rect key={`${x}-${y}`} x={x} y={y} width={w} height={h} fill={palette.accent} />
      ))}
    </Svg>
  );
}

/** Symbole + « Qamar Réseaux ». */
export function QamarLogo({ size = 40 }: { size?: number }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }} accessibilityRole="header" accessibilityLabel="Qamar Réseaux">
      <QamarMark width={size} />
      <View>
        <Text style={{ fontSize: size * 0.42, fontWeight: "700", letterSpacing: -0.4, lineHeight: size * 0.46 }}>Qamar</Text>
        <Text style={{ fontSize: size * 0.24, fontFamily: "mono", fontWeight: "500", letterSpacing: 1.6, color: palette.muted }}>
          RÉSEAUX
        </Text>
      </View>
    </View>
  );
}

/** Forme du bouton Scan (parallélogramme orange). */
export function ScanPlate({ width = 74, height = 54, color = palette.accent }: { width?: number; height?: number; color?: string }) {
  const k = height * 0.43;
  return (
    <Svg width={width} height={height} style={{ position: "absolute" }}>
      <Polygon
        points={`${k},2 ${width - 2},2 ${width - k},${height - 2} 2,${height - 2}`}
        fill={color}
        stroke={color}
        strokeWidth={4}
        strokeLinejoin="round"
      />
    </Svg>
  );
}
