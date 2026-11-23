// Aperçu de la carte aux couleurs du commerçant, fidèle au rendu Wallet (fonctionne hors ligne).
// Logo, pictogramme des tampons et motif en filigrane viennent du studio.
import { Image, StyleSheet, View } from "react-native";
import Animated, { FadeIn, ZoomIn } from "react-native-reanimated";
import { SvgXml } from "react-native-svg";
import { isStampIcon, patternSvg, STAMP_ICONS, type StampIcon } from "@/lib/card-design";
import type { ProgramType } from "@/lib/types";
import { Text } from "./text";
import { radius, space } from "./theme";

export interface CardPreviewProps {
  merchantName: string;
  title: string;
  type: ProgramType;
  value: number;
  goal: number;
  rewardLabel: string;
  bgColor: string;
  fgColor: string;
  accentColor: string;
  footer?: string;
  stampIcon?: StampIcon;
  pattern?: boolean;
  logo?: string;
  /** Photo de fond de la bannière (sous les tampons). */
  banner?: string;
  /** Couleur des petits titres ; par défaut la couleur du texte, atténuée. */
  labelColor?: string;
}

const icon = (name: StampIcon | undefined) => `<svg viewBox="0 0 24 24">${STAMP_ICONS[isStampIcon(name) ? name : "star"].svg}</svg>`;

export function CardPreview(props: CardPreviewProps) {
  const { merchantName, title, type, value, goal, rewardLabel, bgColor, fgColor, accentColor, footer, stampIcon, pattern, logo, banner, labelColor } = props;
  const label = labelColor ? { color: labelColor, opacity: 1 } : { color: fgColor, opacity: 0.65 };
  const safeGoal = Math.max(1, goal);
  const count = Math.min(safeGoal, 30);
  return (
    <Animated.View entering={FadeIn.duration(400)} style={[styles.card, { backgroundColor: bgColor }]}>
      {pattern && !banner && isStampIcon(stampIcon) ? (
        <SvgXml
          xml={`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 380" preserveAspectRatio="xMidYMid slice">${patternSvg(stampIcon, 600, 380, fgColor, 0.08)}</svg>`}
          width="100%"
          height="100%"
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      ) : null}

      <View style={styles.head}>
        {logo ? (
          <Image source={{ uri: logo }} style={styles.logo} accessibilityIgnoresInvertColors />
        ) : (
          <View style={[styles.logo, { backgroundColor: accentColor, alignItems: "center", justifyContent: "center" }]}>
            <Text style={{ color: bgColor, fontWeight: "700", fontSize: 15 }}>{merchantName.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <Text style={{ color: fgColor, flex: 1, fontSize: 15, fontWeight: "600" }} numberOfLines={1}>
          {merchantName}
        </Text>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={[{ fontSize: 9.5, fontFamily: "mono", letterSpacing: 1, textTransform: "uppercase" }, label]}>
            {type === "stamps" ? "Tampons" : "Points"}
          </Text>
          <Text style={{ color: fgColor, fontSize: 17, fontWeight: "600", fontVariant: ["tabular-nums"] }}>
            {value}
            <Text style={{ color: fgColor, opacity: 0.55, fontSize: 17 }}>/{safeGoal}</Text>
          </Text>
        </View>
      </View>

      <Text style={{ color: fgColor, fontSize: 24, fontWeight: "700", letterSpacing: -0.6 }}>{title}</Text>

      <View style={banner ? styles.bannerBox : undefined}>
      {banner ? (
        <>
          <Image source={{ uri: banner }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityIgnoresInvertColors />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: bgColor, opacity: 0.5 }]} />
        </>
      ) : null}
      {type === "stamps" ? (
        <View style={styles.stamps} accessibilityLabel={`${value} tampons sur ${safeGoal}`}>
          {Array.from({ length: count }, (_, i) => {
            const filled = i < value;
            return (
              <Animated.View
                key={i}
                entering={ZoomIn.delay(40 * i).springify().damping(14)}
                style={[styles.stamp, filled ? { backgroundColor: accentColor, borderColor: accentColor } : { borderColor: fgColor + "55", borderStyle: "dashed" }]}
              >
                <SvgXml xml={icon(stampIcon)} width={18} height={18} color={filled ? bgColor : fgColor} opacity={filled ? 1 : 0.28} />
              </Animated.View>
            );
          })}
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          <Text style={{ color: fgColor, fontSize: 28, fontWeight: "700" }}>
            {value} <Text style={{ color: fgColor, fontSize: 15, fontWeight: "500", opacity: 0.7 }}>/ {safeGoal} pts</Text>
          </Text>
          <View style={[styles.progress, { backgroundColor: fgColor + "26" }]}>
            <View style={[styles.progressFill, { width: `${Math.min(100, (value / safeGoal) * 100)}%`, backgroundColor: accentColor }]} />
          </View>
        </View>
      )}
      </View>

      <View style={[styles.foot, { borderTopColor: fgColor + "22" }]}>
        <View style={{ flex: 1 }}>
          <Text style={[{ fontSize: 9.5, fontFamily: "mono", letterSpacing: 1, textTransform: "uppercase" }, label]}>Récompense</Text>
          <Text style={{ color: fgColor, fontSize: 15, fontWeight: "500" }}>{rewardLabel}</Text>
        </View>
      </View>
      {footer ? <Text style={{ color: fgColor, opacity: 0.7, fontSize: 12 }}>{footer}</Text> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: space.xl,
    gap: space.md,
    overflow: "hidden",
    shadowColor: "#1a0e05",
    shadowOpacity: 0.22,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  head: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { width: 34, height: 34, borderRadius: 17, overflow: "hidden" },
  stamps: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  stamp: { width: 34, height: 34, borderRadius: 10, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  bannerBox: { borderRadius: 14, overflow: "hidden", padding: space.md, marginHorizontal: -6 },
  progress: { height: 12, borderRadius: 6, overflow: "hidden" },
  progressFill: { height: 12, borderRadius: 6 },
  foot: { flexDirection: "row", borderTopWidth: 1, paddingTop: space.md },
});
