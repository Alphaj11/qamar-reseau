// Barre d'onglets Qamar : pilule noire flottante avec une encoche en U sous l'onglet actif.
// Le bouton orange de l'onglet actif est posé dans l'encoche ; encoche et bouton glissent ensemble d'onglet en onglet.
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import type { BottomTabBarProps } from "expo-router/js-tabs";
import { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, View, type LayoutChangeEvent } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import type { IconName } from "./components";
import { Text } from "./text";
import { palette as p } from "./theme";

export interface TabSpec {
  icon: IconName;
  activeIcon: IconName;
  label: string;
  badge?: number;
}

const BAR_H = 64;
const PAD = 36; // marge intérieure gauche/droite, garde l'encoche loin des bouts arrondis
const BUTTON = 50; // bouton orange
const CENTER_Y = 4; // centre du bouton, juste sous le bord haut : il dépasse au-dessus de la barre
const GAP = 7; // espace vide entre le bouton et le U
const R = BUTTON / 2 + GAP; // rayon du U
const NOTCH_DEPTH = CENTER_Y + R; // fond du U
const BUTTON_TOP = CENTER_Y - BUTTON / 2;
const SPRING = { damping: 18, stiffness: 180, mass: 0.9 };

// Le U suit le bouton (arc de cercle) et rejoint le haut de la barre par deux épaules arrondies.
const THETA = (25 * Math.PI) / 180; // où l'arc rejoint l'épaule
const ARC_X = R * Math.cos(THETA);
const ARC_Y = CENTER_Y + R * Math.sin(THETA);
const CTRL_X = ARC_X + Math.tan(THETA) * ARC_Y; // point de contrôle tangent à l'arc, sur le bord haut
const NOTCH_HALF = Math.ceil(CTRL_X + 5); // demi-largeur totale de l'encoche

/** Bande noire deux fois plus large que la barre, encoche au centre : on la fait glisser au lieu de redessiner. */
function stripPath(w: number) {
  const cx = w;
  const f = (n: number) => n.toFixed(2);
  return [
    `M0 0 H${f(cx - NOTCH_HALF)}`,
    `Q${f(cx - CTRL_X)} 0 ${f(cx - ARC_X)} ${f(ARC_Y)}`,
    `A${R} ${R} 0 0 0 ${f(cx + ARC_X)} ${f(ARC_Y)}`,
    `Q${f(cx + CTRL_X)} 0 ${f(cx + NOTCH_HALF)} 0`,
    `H${2 * w} V${BAR_H} H0 Z`,
  ].join(" ");
}

export function QamarTabBar({ state, descriptors, emitter, navigateToTab, insets, specs }: BottomTabBarProps & { specs: Record<string, TabSpec> }) {
  const routes = state.routes.filter((r) => specs[r.name] && !(descriptors[r.key].options as { hidden?: boolean }).hidden);
  const activeKey = state.routes[state.index]?.key;
  const activeIndex = Math.max(0, routes.findIndex((r) => r.key === activeKey));
  const active = routes[activeIndex] ? specs[routes[activeIndex].name] : undefined;

  const [width, setWidth] = useState(0);
  const slot = routes.length && width ? (width - 2 * PAD) / routes.length : 0;
  const center = (i: number) => PAD + slot * (i + 0.5);

  const x = useSharedValue(0); // centre de l'onglet actif, en px depuis le bord gauche de la barre
  const dip = useSharedValue(0); // le bouton plonge un peu dans le U puis remonte
  const pop = useSharedValue(1);
  const ready = useSharedValue(0);

  useEffect(() => {
    if (!slot) return;
    const target = center(activeIndex);
    if (!ready.value) {
      x.value = target;
      ready.value = withTiming(1, { duration: 250 });
      return;
    }
    x.value = withSpring(target, SPRING);
    dip.value = withSequence(withTiming(10, { duration: 140 }), withSpring(0, { damping: 11, stiffness: 220 }));
    pop.value = withSequence(withTiming(0.88, { duration: 140 }), withSpring(1, { damping: 9, stiffness: 240 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, slot]);

  const stripStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value - width }] }));
  const knobStyle = useAnimatedStyle(() => ({ opacity: ready.value, transform: [{ translateX: x.value - NOTCH_HALF }] }));
  const buttonStyle = useAnimatedStyle(() => ({ transform: [{ translateY: dip.value }, { scale: pop.value }] }));

  function press(key: string, focused: boolean) {
    const event = emitter.emit({ type: "tabPress", target: key, canPreventDefault: true });
    if (focused || event.defaultPrevented) return;
    if (Platform.OS !== "web") void Haptics.selectionAsync().catch(() => undefined);
    navigateToTab(key);
  }

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.bar} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)} role="tablist">
        {/* Fond noir avec l'encoche (découpé aux bouts arrondis) */}
        <View pointerEvents="none" style={styles.clip}>
          {width > 0 && (
            <Animated.View style={[{ width: 2 * width, height: BAR_H }, stripStyle]}>
              <Svg width={2 * width} height={BAR_H}>
                <Path d={stripPath(width)} fill={p.night} />
              </Svg>
            </Animated.View>
          )}
        </View>

        {/* Onglets inactifs : icône et nom en gris */}
        {routes.map((route) => {
          const spec = specs[route.name];
          const focused = route.key === activeKey;
          return (
            <Pressable
              key={route.key}
              onPress={() => press(route.key, focused)}
              onLongPress={() => emitter.emit({ type: "tabLongPress", target: route.key })}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={spec.badge ? `${spec.label}, ${spec.badge} en attente` : spec.label}
              style={styles.item}
            >
              {({ pressed }) => (
                <View style={[styles.iconBox, { opacity: focused ? 0 : 1, transform: [{ scale: pressed ? 0.88 : 1 }] }]}>
                  <Ionicons name={spec.icon} size={22} color={p.nightMuted} />
                  <Text style={styles.label} numberOfLines={1}>
                    {spec.label}
                  </Text>
                  {spec.badge ? <Badge n={spec.badge} /> : null}
                </View>
              )}
            </Pressable>
          );
        })}

        {/* Onglet actif : bouton orange dans le U + nom en dessous, qui glissent avec l'encoche */}
        {width > 0 && active && (
          <Animated.View pointerEvents="none" style={[styles.knob, knobStyle]}>
            <Animated.View style={[styles.button, buttonStyle]}>
              <Ionicons name={active.activeIcon} size={24} color="#fff" />
              {active.badge ? <Badge n={active.badge} /> : null}
            </Animated.View>
            <Text style={styles.activeLabel} numberOfLines={1}>
              {active.label}
            </Text>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

function Badge({ n }: { n: number }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{n > 99 ? "99+" : n}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 16 },
  bar: {
    flexDirection: "row",
    height: BAR_H,
    paddingHorizontal: PAD,
    alignItems: "center",
    borderRadius: BAR_H / 2,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    ...(Platform.OS === "web" ? { maxWidth: 520, width: "100%", alignSelf: "center" } : null),
  },
  clip: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: BAR_H / 2,
    overflow: "hidden",
  },
  item: { flex: 1, height: "100%", alignItems: "center", justifyContent: "center" },
  iconBox: { alignItems: "center", justifyContent: "center", gap: 4, minWidth: 52, height: 52 },
  label: { color: p.nightMuted, fontSize: 9.5, fontFamily: "mono", fontWeight: "500", letterSpacing: 0.3 },
  knob: { position: "absolute", left: 0, top: 0, width: NOTCH_HALF * 2, height: BAR_H, alignItems: "center" },
  button: {
    position: "absolute",
    top: BUTTON_TOP,
    width: BUTTON,
    height: BUTTON,
    borderRadius: BUTTON / 2,
    backgroundColor: p.accent,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: p.accent,
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  activeLabel: {
    position: "absolute",
    top: NOTCH_DEPTH + 7,
    color: p.accentLight,
    fontSize: 9.5,
    fontFamily: "mono",
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: p.warn,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: p.night,
  },
  badgeText: { color: "#fff", fontSize: 10, fontFamily: "mono", fontWeight: "600" },
});
