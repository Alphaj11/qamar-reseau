// Composants d'interface, dans l'univers Qamar (voir theme.ts et la maquette Figma).
// Toute la mise en forme passe par ici et par theme.ts pour pouvoir tout restyler d'un coup.
import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps, ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStore } from "@/lib/store";
import { Text, TextInput } from "./text";
import { radius, shadow, space, TAB_BAR_SPACE, type as typo, usePalette } from "./theme";

export type IconName = ComponentProps<typeof Ionicons>["name"];

// ——— Mise en page ———

export function Screen({ children }: { children: ReactNode }) {
  const p = usePalette();
  return <View style={{ flex: 1, backgroundColor: p.bg }}>{children}</View>;
}

/**
 * Contenu défilant standard d'un écran.
 * `title` : grand titre en haut (écrans d'onglets, sans barre de navigation) ; la zone du haut
 * de l'iPhone (encoche) est alors respectée. `tabs` : laisse la place à la barre d'onglets flottante.
 */
export function ScrollScreen({
  children,
  refreshControl,
  title,
  eyebrow,
  right,
  tabs,
}: {
  children: ReactNode;
  refreshControl?: ComponentProps<typeof ScrollView>["refreshControl"];
  title?: string;
  eyebrow?: string;
  right?: ReactNode;
  tabs?: boolean;
}) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: p.bg }}
      contentContainerStyle={{
        padding: space.lg,
        paddingTop: title ? insets.top + space.lg : space.lg,
        gap: space.lg,
        paddingBottom: tabs ? TAB_BAR_SPACE + insets.bottom : space.xl * 2,
      }}
      keyboardShouldPersistTaps="handled"
      refreshControl={refreshControl}
    >
      {title ? (
        <Animated.View entering={FadeInDown.duration(420)} style={styles.screenHead}>
          <View style={{ flex: 1, gap: 4 }}>
            {eyebrow ? <Text style={[typo.label, { color: p.muted }]}>{eyebrow}</Text> : null}
            <Text style={typo.titleL} accessibilityRole="header">
              {title}
              <Text style={[typo.titleL, { color: p.accent }]}>.</Text>
            </Text>
          </View>
          {right}
        </Animated.View>
      ) : null}
      {children}
    </ScrollView>
  );
}

export function Section({ title, action, children }: { title?: string; action?: ReactNode; children: ReactNode }) {
  const p = usePalette();
  return (
    <Animated.View entering={FadeInDown.duration(450).delay(60)} style={{ gap: space.sm }}>
      {(title || action) && (
        <View style={styles.sectionHead}>
          {title ? <Text style={[typo.label, { color: p.muted }]}>{title}</Text> : <View />}
          {action}
        </View>
      )}
      <View style={[styles.panel, shadow, { backgroundColor: p.surface, borderColor: p.line }]}>{children}</View>
    </Animated.View>
  );
}

export function Row({
  title,
  subtitle,
  right,
  icon,
  onPress,
  last,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  icon?: IconName;
  onPress?: () => void;
  last?: boolean;
}) {
  const p = usePalette();
  const content = (
    <View style={[styles.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: p.line }]}>
      {icon && (
        <View style={[styles.rowIcon, { backgroundColor: p.surface2 }]}>
          <Ionicons name={icon} size={18} color={p.text} />
        </View>
      )}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: p.text, fontSize: 16, fontWeight: "500" }} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={{ color: p.muted, fontSize: 13, lineHeight: 18 }} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {typeof right === "string" ? <Text style={{ color: p.muted, fontSize: 13, fontFamily: "mono" }}>{right}</Text> : right}
      {onPress && <Ionicons name="chevron-forward" size={16} color={p.muted} />}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={title} style={({ pressed }) => ({ backgroundColor: pressed ? p.surface2 : "transparent" })}>
      {content}
    </Pressable>
  );
}

// ——— Actions et saisie ———

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled,
  loading,
  color,
  textColor,
  icon,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  loading?: boolean;
  color?: string;
  textColor?: string;
  icon?: IconName;
}) {
  const p = usePalette();
  const primary = variant === "primary";
  const bg = color ?? (primary ? p.primary : p.surface2);
  const fg = textColor ?? (primary ? p.onPrimary : variant === "danger" ? p.danger : p.text);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, borderColor: primary ? bg : p.line, opacity: disabled ? 0.4 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.buttonInner}>
          {icon && <Ionicons name={icon} size={18} color={fg} />}
          <Text style={[typo.button, { color: fg }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function Field({ label, error, hint, ...props }: TextInputProps & { label: string; error?: string; hint?: string }) {
  const p = usePalette();
  return (
    <View style={{ gap: 6 }}>
      <Text style={[typo.label, { color: p.muted }]}>{label}</Text>
      <TextInput
        placeholderTextColor={p.muted}
        accessibilityLabel={label}
        {...props}
        style={[
          styles.input,
          props.multiline && { minHeight: 96, paddingTop: 12, textAlignVertical: "top" },
          { color: p.text, backgroundColor: p.surface2, borderColor: error ? p.danger : p.line },
        ]}
      />
      {error ? <Text style={{ color: p.danger, fontSize: 13 }}>{error}</Text> : hint ? <Text style={{ color: p.muted, fontSize: 13 }}>{hint}</Text> : null}
    </View>
  );
}

/** Choix exclusif entre quelques options (ex. 7 j / 30 j / 90 j). */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  disabled,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  const p = usePalette();
  return (
    <View style={[styles.segmented, { backgroundColor: p.surface, borderColor: p.line, opacity: disabled ? 0.5 : 1 }]} accessibilityRole="radiogroup">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            onPress={() => !disabled && onChange(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active, disabled }}
            accessibilityLabel={o.label}
            style={[styles.segment, active && { backgroundColor: p.inverse }]}
          >
            <Text style={{ color: active ? p.onInverse : p.muted, fontWeight: active ? "600" : "500", fontSize: 13, fontFamily: "mono" }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Stepper({
  value,
  onChange,
  min,
  max,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  label: string;
}) {
  const p = usePalette();
  const btn = (delta: number, icon: IconName, name: string) => (
    <Pressable
      onPress={() => onChange(Math.min(max, Math.max(min, value + delta)))}
      disabled={delta < 0 ? value <= min : value >= max}
      accessibilityRole="button"
      accessibilityLabel={`${name} (${label})`}
      style={({ pressed }) => [styles.stepBtn, { borderColor: p.line, backgroundColor: pressed ? p.surface : p.surface2 }]}
    >
      <Ionicons name={icon} size={22} color={p.text} />
    </Pressable>
  );
  return (
    <View style={styles.stepper}>
      {btn(-1, "remove", "Moins")}
      <Text style={{ color: p.text, fontSize: 32, fontWeight: "600", minWidth: 56, textAlign: "center", fontVariant: ["tabular-nums"] }} accessibilityLabel={`${label} : ${value}`}>
        {value}
      </Text>
      {btn(1, "add", "Plus")}
    </View>
  );
}

// ——— États ———

export function Loading() {
  const p = usePalette();
  return <ActivityIndicator style={{ marginTop: space.xl * 2 }} color={p.accent} accessibilityLabel="Chargement" />;
}

/** Rappel du mode démo, avec la sortie. */
export function DemoBanner({ onExit }: { onExit: () => void }) {
  const p = usePalette();
  return (
    <Animated.View entering={FadeInDown.duration(400)} style={[styles.demo, { backgroundColor: p.inverse }]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[typo.label, { color: p.accentLight }]}>Mode démo</Text>
        <Text style={{ color: p.onInverse, fontSize: 14, lineHeight: 19 }}>Boutique fictive : explorez librement, rien n&apos;est enregistré.</Text>
      </View>
      <Pressable onPress={onExit} accessibilityRole="button" hitSlop={8} style={({ pressed }) => [styles.demoExit, { borderColor: p.nightLine, opacity: pressed ? 0.7 : 1 }]}>
        <Text style={{ color: p.onInverse, fontSize: 13, fontWeight: "600" }}>Quitter</Text>
      </Pressable>
    </Animated.View>
  );
}

/** Page réservée au responsable, vue par un vendeur. */
export function OwnerOnly({ what }: { what: string }) {
  return (
    <Message
      icon="lock-closed-outline"
      title="Réservé au responsable"
      text={`${what} : accessible uniquement avec le compte du responsable de la boutique.`}
    />
  );
}

export function Message({ icon, title, text, action }: { icon: IconName; title: string; text?: string; action?: ReactNode }) {
  const p = usePalette();
  return (
    <View style={styles.message}>
      <View style={[styles.messageIcon, { backgroundColor: p.accentSoft }]}>
        <Ionicons name={icon} size={26} color={p.accent} />
      </View>
      <Text style={[typo.titleM, { textAlign: "center" }]}>{title}</Text>
      {text ? <Text style={{ color: p.muted, textAlign: "center", fontSize: 15, lineHeight: 21 }}>{text}</Text> : null}
      {action}
    </View>
  );
}

export function ErrorMessage({ error, onRetry }: { error: { kind: string; message: string }; onRetry?: () => void }) {
  return (
    <Message
      icon={error.kind === "offline" ? "cloud-offline-outline" : error.kind === "forbidden" ? "lock-closed-outline" : "alert-circle-outline"}
      title={error.kind === "offline" ? "Hors ligne" : error.kind === "forbidden" ? "Accès réservé" : "Une erreur est survenue"}
      text={error.message}
      action={onRetry && error.kind !== "forbidden" ? <Button label="Réessayer" variant="secondary" onPress={onRetry} /> : undefined}
    />
  );
}

export function Notice({ tone, text }: { tone: "ok" | "error" | "info"; text: string }) {
  const p = usePalette();
  const color = tone === "ok" ? p.ok : tone === "error" ? p.danger : p.muted;
  const bg = tone === "ok" ? p.okSoft : tone === "error" ? p.dangerSoft : p.neutralSoft;
  const icon: IconName = tone === "ok" ? "checkmark-circle" : tone === "error" ? "alert-circle" : "information-circle";
  return (
    <View accessibilityLiveRegion="polite" style={[styles.notice, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={{ color: tone === "info" ? p.text : color, fontWeight: "500", fontSize: 14, lineHeight: 20, flex: 1 }}>{text}</Text>
    </View>
  );
}

// ——— Données ———

export function StatTile({ label, value, hint, style }: { label: string; value: string; hint?: string; style?: ViewStyle }) {
  const p = usePalette();
  return (
    <View style={[styles.tile, shadow, { backgroundColor: p.surface, borderColor: p.line }, style]} accessibilityLabel={`${label} : ${value}`}>
      <Text style={[typo.label, { color: p.muted, lineHeight: 15 }]} numberOfLines={2}>
        {label}
      </Text>
      <Text style={[typo.figure, { fontVariant: ["tabular-nums"] }]}>{value}</Text>
      {hint ? <Text style={{ color: p.muted, fontSize: 12, lineHeight: 16 }}>{hint}</Text> : null}
    </View>
  );
}

/** Mini histogramme en barres. `allLabels` : une étiquette sous chaque barre (jours de la semaine…). */
export function Bars({
  data,
  allLabels,
  description = "Histogramme",
}: {
  data: { label: string; value: number }[];
  allLabels?: boolean;
  description?: string;
}) {
  const p = usePalette();
  const max = Math.max(1, ...data.map((d) => d.value));
  const top = data.findIndex((d) => d.value === max);
  return (
    <View style={{ gap: 6 }}>
      <View
        style={styles.bars}
        accessibilityLabel={`${description} : ${data.map((d) => `${d.label} ${d.value}`).join(", ")}`}
      >
        {data.map((d, i) => (
          <View key={`${d.label}-${i}`} style={styles.barCol}>
            <View style={[styles.bar, { height: `${Math.max(2, (d.value / max) * 100)}%`, backgroundColor: !d.value ? p.surface2 : i === top ? p.accent : p.accentSoft }]} />
          </View>
        ))}
      </View>
      {allLabels ? (
        <View style={{ flexDirection: "row", gap: 4 }}>
          {data.map((d, i) => (
            <Text key={`${d.label}-${i}`} style={{ flex: 1, textAlign: "center", color: p.muted, fontSize: 11, fontFamily: "mono" }}>
              {d.label}
            </Text>
          ))}
        </View>
      ) : (
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ color: p.muted, fontSize: 11, fontFamily: "mono" }}>{data[0]?.label}</Text>
          <Text style={{ color: p.muted, fontSize: 11, fontFamily: "mono" }}>{data[data.length - 1]?.label}</Text>
        </View>
      )}
    </View>
  );
}

/** Onglets internes défilants (sections d'un écran). */
export function Chips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; icon?: IconName }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const p = usePalette();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={[styles.chip, { backgroundColor: on ? p.inverse : p.surface, borderColor: on ? p.inverse : p.line }]}
          >
            {o.icon && <Ionicons name={o.icon} size={16} color={on ? p.onInverse : p.muted} />}
            <Text style={{ color: on ? p.onInverse : p.text, fontWeight: "600", fontSize: 14 }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Évolution par rapport à la période précédente : "+12 %", "−3 %", "nouveau". */
export function trend(current: number, previous: number) {
  if (!previous) return "Aucun sur la période précédente";
  const pct = Math.round(((current - previous) / previous) * 100);
  return `${pct > 0 ? "+" : pct < 0 ? "−" : ""}${Math.abs(pct)} % par rapport à la période précédente`;
}

export function Badge({ text, tone = "neutral" }: { text: string; tone?: "neutral" | "ok" | "warn" | "accent" | "danger" }) {
  const p = usePalette();
  const [color, bg] = {
    ok: [p.ok, p.okSoft],
    warn: [p.warn, p.warnSoft],
    accent: [p.accentLight, p.accentSoft],
    danger: [p.danger, p.dangerSoft],
    neutral: [p.muted, p.neutralSoft],
  }[tone];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={{ color, fontSize: 11, fontWeight: "600", fontFamily: "mono", letterSpacing: 0.4 }}>{text}</Text>
    </View>
  );
}

/** Pastille "En ligne / Hors ligne · N en attente". */
export function SyncStatus() {
  const p = usePalette();
  const { online, syncing, ledger, syncNow } = useStore();
  const pending = ledger.pending.length;
  const color = !online || pending ? p.warn : p.ok;
  const label = !online
    ? `Hors ligne${pending ? ` · ${pending} en attente` : ""}`
    : syncing
      ? "Synchronisation…"
      : pending
        ? `${pending} en attente`
        : "À jour";
  return (
    <Pressable onPress={() => void syncNow()} accessibilityRole="button" accessibilityLabel={`${label}, toucher pour synchroniser`}>
      <View style={[styles.pill, { borderColor: p.line, backgroundColor: p.surface }]}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text style={{ color: p.text, fontSize: 12, fontWeight: "500", fontFamily: "mono" }}>{label}</Text>
      </View>
    </Pressable>
  );
}

export { CardPreview } from "./CardPreview";

const styles = StyleSheet.create({
  demo: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: radius.lg, paddingVertical: 14, paddingHorizontal: 16 },
  demoExit: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  screenHead: { flexDirection: "row", alignItems: "flex-end", gap: space.md, marginBottom: space.xs },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 4 },
  panel: { borderRadius: radius.lg, borderWidth: 1, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: space.md, paddingHorizontal: space.lg, paddingVertical: 12, minHeight: 60 },
  rowIcon: { width: 36, height: 36, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  button: { minHeight: 54, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: 20, alignItems: "center", justifyContent: "center" },
  buttonInner: { flexDirection: "row", alignItems: "center", gap: 10 },
  input: { minHeight: 52, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: 16, fontSize: 16 },
  segmented: { flexDirection: "row", borderRadius: radius.md, borderWidth: 1, padding: 4 },
  segment: { flex: 1, minHeight: 38, alignItems: "center", justifyContent: "center", borderRadius: radius.sm },
  stepper: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 20 },
  stepBtn: { width: 52, height: 52, borderRadius: 26, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  message: { alignItems: "center", gap: space.md, padding: space.xl, marginTop: space.xl },
  messageIcon: { width: 56, height: 56, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  notice: { flexDirection: "row", alignItems: "flex-start", gap: 10, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12 },
  tile: { flex: 1, minWidth: 140, borderRadius: radius.lg, borderWidth: 1, padding: space.lg, gap: 6 },
  bars: { flexDirection: "row", alignItems: "flex-end", height: 96, gap: 4 },
  barCol: { flex: 1, height: "100%", justifyContent: "flex-end" },
  bar: { borderRadius: 2, minHeight: 4 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 40, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1 },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  pill: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
