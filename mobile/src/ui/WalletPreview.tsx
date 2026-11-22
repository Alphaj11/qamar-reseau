// Aperçu de la carte telle que le client la verra dans son téléphone : Apple Wallet (iPhone) ou Google Wallet (Android).
// But : rendre visible la promesse du produit, avant même d'avoir un premier client. Tout est dessiné ici (hors ligne).
import { Image, StyleSheet, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { SvgXml } from "react-native-svg";
import { isStampIcon, patternSvg, STAMP_ICONS, type StampIcon } from "@/lib/card-design";
import type { ProgramType } from "@/lib/types";
import { Text } from "./text";

export type WalletKind = "apple" | "google";

export interface WalletPreviewProps {
  kind: WalletKind;
  merchantName: string;
  title: string;
  type: ProgramType;
  value: number;
  goal: number;
  rewardLabel: string;
  bgColor: string;
  fgColor: string;
  accentColor: string;
  labelColor?: string;
  stampIcon?: StampIcon;
  pattern?: boolean;
  logo?: string;
  banner?: string;
  holder?: string;
}

const icon = (name: StampIcon | undefined) => `<svg viewBox="0 0 24 24">${STAMP_ICONS[isStampIcon(name) ? name : "star"].svg}</svg>`;

/** Texte lisible sur une couleur de fond (Google choisit lui-même noir ou blanc). */
function readableOn(hex: string) {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return "#ffffff";
  const [r, g, b] = [m[1], m[2], m[3]].map((x) => parseInt(x, 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.6 ? "#1f1f1f" : "#ffffff";
}

/** Faux QR code (motif fixe) : seul l'aspect compte dans un aperçu. */
const QR_XML = (() => {
  const n = 25;
  let cells = "";
  const finder = (x: number, y: number) =>
    `<rect x="${x}" y="${y}" width="7" height="7"/><rect x="${x + 1}" y="${y + 1}" width="5" height="5" fill="#fff"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3"/>`;
  let seed = 7;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const inFinder = (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9);
      seed = (seed * 9301 + 49297) % 233280;
      if (!inFinder && seed / 233280 > 0.52) cells += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges"><g fill="#111">${finder(0, 0)}${finder(n - 7, 0)}${finder(0, n - 7)}${cells}</g></svg>`;
})();

function Qr({ size }: { size: number }) {
  return (
    <View style={styles.qrBox}>
      <SvgXml xml={QR_XML} width={size} height={size} />
    </View>
  );
}

function Logo({ logo, name, accent, bg, size }: { logo?: string; name: string; accent: string; bg: string; size: number }) {
  if (logo) return <Image source={{ uri: logo }} style={{ width: size, height: size, borderRadius: size / 2 }} accessibilityIgnoresInvertColors />;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: accent, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: bg, fontWeight: "700", fontSize: size * 0.45 }}>{name.charAt(0).toUpperCase() || "Q"}</Text>
    </View>
  );
}

/** La bannière : tampons (ou barre de points) sur la couleur de fond, la photo ou le filigrane. */
function Strip(props: WalletPreviewProps & { height: number }) {
  const { type, value, goal, bgColor, fgColor, accentColor, stampIcon, pattern, banner, height, rewardLabel } = props;
  const safeGoal = Math.max(1, goal);
  const count = Math.min(safeGoal, 20);
  const rows = count <= 6 ? 1 : 2;
  const perRow = Math.ceil(count / rows);
  const d = Math.min(30, Math.floor((height - 20) / rows) - 6);
  return (
    <View style={{ height, backgroundColor: bgColor, overflow: "hidden", justifyContent: "center" }}>
      {banner ? (
        <>
          <Image source={{ uri: banner }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityIgnoresInvertColors />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: bgColor, opacity: 0.5 }]} />
        </>
      ) : pattern && isStampIcon(stampIcon) ? (
        <SvgXml
          xml={`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 375 144" preserveAspectRatio="xMidYMid slice">${patternSvg(stampIcon, 375, 144, fgColor, 0.08)}</svg>`}
          width="100%"
          height="100%"
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {type === "stamps" ? (
        <View style={{ gap: 6, alignItems: "center" }}>
          {Array.from({ length: rows }, (_, r) => (
            <View key={r} style={{ flexDirection: "row", gap: 6 }}>
              {Array.from({ length: Math.min(perRow, count - r * perRow) }, (_, c) => {
                const i = r * perRow + c;
                const filled = i < value;
                return (
                  <View
                    key={c}
                    style={{
                      width: d,
                      height: d,
                      borderRadius: d / 2,
                      alignItems: "center",
                      justifyContent: "center",
                      ...(filled ? { backgroundColor: accentColor } : { borderWidth: 1.5, borderStyle: "dashed", borderColor: fgColor + "77" }),
                    }}
                  >
                    <SvgXml xml={icon(stampIcon)} width={d * 0.58} height={d * 0.58} color={filled ? bgColor : fgColor} opacity={filled ? 1 : 0.25} />
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      ) : (
        <View style={{ paddingHorizontal: 18, gap: 6 }}>
          <Text style={{ color: fgColor, fontSize: 24, fontWeight: "700" }}>
            {value} <Text style={{ color: fgColor, fontSize: 13, opacity: 0.7 }}>/ {safeGoal} pts</Text>
          </Text>
          <View style={{ height: 9, borderRadius: 5, backgroundColor: fgColor + "26", overflow: "hidden" }}>
            <View style={{ height: 9, width: `${Math.min(100, (value / safeGoal) * 100)}%`, backgroundColor: accentColor }} />
          </View>
          <Text style={{ color: fgColor, fontSize: 11, opacity: 0.75 }} numberOfLines={1}>
            {rewardLabel}
          </Text>
        </View>
      )}
    </View>
  );
}

function Field({ label, value, labelColor, color, align = "left" }: { label: string; value: string; labelColor: string; color: string; align?: "left" | "right" }) {
  return (
    <View style={{ flex: 1, alignItems: align === "right" ? "flex-end" : "flex-start" }}>
      <Text style={{ color: labelColor, fontSize: 9, fontWeight: "600", letterSpacing: 0.6, textTransform: "uppercase" }}>{label}</Text>
      <Text style={{ color, fontSize: 13, fontWeight: "500", textAlign: align }} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function ApplePass(props: WalletPreviewProps) {
  const { merchantName, type, value, goal, rewardLabel, bgColor, fgColor, accentColor, labelColor, logo, holder } = props;
  const remaining = Math.max(0, goal - value);
  const unit = type === "stamps" ? "tampon" : "point";
  const lbl = labelColor ?? fgColor + "b3";
  return (
    <View style={[styles.applePass, { backgroundColor: bgColor }]}>
      <View style={styles.appleHead}>
        <Logo logo={logo} name={merchantName} accent={accentColor} bg={bgColor} size={26} />
        <Text style={{ color: fgColor, fontSize: 15, fontWeight: "600", flex: 1 }} numberOfLines={1}>
          {merchantName}
        </Text>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ color: lbl, fontSize: 9, fontWeight: "600", letterSpacing: 0.6, textTransform: "uppercase" }}>{type === "stamps" ? "Tampons" : "Points"}</Text>
          <Text style={{ color: fgColor, fontSize: 18, fontWeight: "500" }}>{type === "stamps" ? `${value}/${goal}` : `${value} pts`}</Text>
        </View>
      </View>
      <Strip {...props} height={112} />
      <View style={styles.appleFields}>
        <Field label="Récompense" value={rewardLabel} labelColor={lbl} color={fgColor} />
        <Field label="Statut" value={`Encore ${remaining} ${unit}${remaining > 1 ? "s" : ""}`} labelColor={lbl} color={fgColor} align="right" />
      </View>
      <View style={[styles.appleFields, { paddingTop: 0 }]}>
        <Field label="Membre" value={holder ?? "Camille"} labelColor={lbl} color={fgColor} />
      </View>
      <View style={{ alignItems: "center", paddingBottom: 16, paddingTop: 4 }}>
        <Qr size={92} />
      </View>
    </View>
  );
}

function GooglePass(props: WalletPreviewProps) {
  const { merchantName, title, type, value, goal, rewardLabel, bgColor, accentColor, logo, holder } = props;
  const ink = readableOn(bgColor);
  const soft = ink === "#ffffff" ? "rgba(255,255,255,0.75)" : "rgba(31,31,31,0.7)";
  return (
    <View style={[styles.googlePass, { backgroundColor: bgColor }]}>
      <View style={styles.googleHead}>
        <Logo logo={logo} name={merchantName} accent={accentColor} bg={bgColor} size={28} />
        <Text style={{ color: ink, fontSize: 14, fontWeight: "500", flex: 1 }} numberOfLines={1}>
          {merchantName}
        </Text>
      </View>
      <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: soft, opacity: 0.4 }} />
      <View style={{ paddingHorizontal: 16, paddingTop: 12, gap: 12 }}>
        <Text style={{ color: ink, fontSize: 20, fontWeight: "500" }} numberOfLines={1}>
          {title}
        </Text>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <Field label={type === "stamps" ? "Tampons" : "Points"} value={type === "stamps" ? `${value}/${goal}` : `${value} pts`} labelColor={soft} color={ink} />
          <Field label="Récompense" value={rewardLabel} labelColor={soft} color={ink} align="right" />
        </View>
        <Field label="Membre" value={holder ?? "Camille"} labelColor={soft} color={ink} />
        <View style={{ alignItems: "center", paddingVertical: 4 }}>
          <Qr size={92} />
        </View>
      </View>
      <Strip {...props} height={100} />
    </View>
  );
}

/** Le téléphone qui entoure la carte : on reconnaît tout de suite l'iPhone ou l'Android. */
export function WalletPreview(props: WalletPreviewProps) {
  const apple = props.kind === "apple";
  return (
    <Animated.View key={props.kind} entering={FadeIn.duration(300)} style={styles.phone}>
      <View style={[styles.screen, { backgroundColor: apple ? "#000" : "#f1f3f4" }]}>
        <View style={[styles.island, { backgroundColor: apple ? "#000" : "transparent" }]} />
        <Text style={{ color: apple ? "#fff" : "#1f1f1f", fontSize: apple ? 26 : 18, fontWeight: apple ? "700" : "500", paddingHorizontal: 14, paddingBottom: 10 }}>
          {apple ? "Wallet" : "Google Wallet"}
        </Text>
        <View style={{ paddingHorizontal: 10, paddingBottom: 14 }}>{apple ? <ApplePass {...props} /> : <GooglePass {...props} />}</View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  phone: {
    alignSelf: "center",
    width: 300,
    borderRadius: 44,
    padding: 9,
    backgroundColor: "#1b1b1d",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },
  screen: { borderRadius: 36, overflow: "hidden", paddingTop: 10 },
  island: { alignSelf: "center", width: 86, height: 24, borderRadius: 12, marginBottom: 8 },
  applePass: { borderRadius: 12, overflow: "hidden" },
  appleHead: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
  appleFields: { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 10, gap: 12 },
  googlePass: { borderRadius: 20, overflow: "hidden" },
  googleHead: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  qrBox: { backgroundColor: "#fff", padding: 8, borderRadius: 8 },
});
