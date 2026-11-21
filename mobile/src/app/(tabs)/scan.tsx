// Onglet Scanner : mode caisse plein écran (nuit Qamar), viseur orange animé, saisie manuelle en secours.
import Ionicons from "@expo/vector-icons/Ionicons";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, { Easing, FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStore } from "@/lib/store";
import { Button, SyncStatus } from "@/ui/components";
import { Text, TextInput } from "@/ui/text";
import { radius, space, TAB_BAR_SPACE, type as typo, usePalette } from "@/ui/theme";

// Le QR de la carte contient le numéro de série (lettres, chiffres, - et _)
const SERIAL = /^[A-Za-z0-9_-]{4,64}$/;
const FRAME = 248;

export default function Scan() {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const { session, ledger, dismissRejected } = useStore();
  const [permission, requestPermission] = useCameraPermissions();
  const [focused, setFocused] = useState(true);
  const [manual, setManual] = useState("");
  const [error, setError] = useState<string>();
  const handled = useRef(false);

  // Une seule caméra active à la fois : on l'éteint quand on quitte l'onglet
  useFocusEffect(
    useCallback(() => {
      handled.current = false;
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );

  function open(serial: string) {
    const s = serial.trim();
    if (!SERIAL.test(s)) {
      setError("Ce QR code n'est pas une carte de fidélité.");
      return;
    }
    setError(undefined);
    setManual("");
    handled.current = true;
    router.push({ pathname: "/card/[serial]", params: { serial: s } });
  }

  function onScanned(result: BarcodeScanningResult) {
    if (handled.current) return;
    open(result.data);
  }

  const granted = !!permission?.granted;

  return (
    <View style={{ flex: 1, backgroundColor: p.night }}>
      {focused && <StatusBar style="light" />}
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ paddingTop: insets.top + space.lg, paddingHorizontal: space.lg, paddingBottom: TAB_BAR_SPACE + insets.bottom, gap: space.xl }}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View entering={FadeInDown.duration(400)} style={styles.head}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[typo.label, { color: p.nightMuted }]}>Caisse · {session?.staff.name}</Text>
              <Text style={[typo.titleL, { color: p.onInverse }]}>
                Scanner<Text style={[typo.titleL, { color: p.accent }]}>.</Text>
              </Text>
            </View>
            <SyncStatus />
          </Animated.View>

          {ledger.rejected.length > 0 && (
            <View style={[styles.alert, { backgroundColor: p.dangerSoft, borderColor: "rgba(210,56,42,0.4)" }]}>
              <Ionicons name="alert-circle" size={20} color="#ff7b6e" />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ color: p.onInverse, fontWeight: "600" }}>Passages refusés à la synchronisation</Text>
                {ledger.rejected.slice(-3).map((r) => (
                  <Text key={r.op.clientOpId} style={{ color: p.nightMuted, fontSize: 13 }}>
                    Carte {r.op.serial} · {r.reason}
                  </Text>
                ))}
                <Pressable onPress={dismissRejected} accessibilityRole="button" hitSlop={8}>
                  <Text style={{ color: p.accentLight, fontWeight: "600", marginTop: 4 }}>J&apos;ai compris</Text>
                </Pressable>
              </View>
            </View>
          )}

          <Animated.View entering={FadeInDown.duration(500).delay(80)} style={[styles.camera, { borderColor: p.nightLine }]}>
            {!permission ? null : !granted ? (
              <View style={styles.cameraMsg}>
                <View style={[styles.camIcon, { backgroundColor: p.accentSoft }]}>
                  <Ionicons name="camera-outline" size={30} color={p.accent} />
                </View>
                <Text style={{ color: p.onInverse, textAlign: "center", fontSize: 17, fontWeight: "600" }}>Autorisez l&apos;appareil photo</Text>
                <Text style={{ color: p.nightMuted, textAlign: "center", fontSize: 14, lineHeight: 20 }}>
                  Il sert uniquement à lire le QR code de la carte de vos clients.
                </Text>
                <Button label="Autoriser" icon="camera-outline" onPress={() => void requestPermission()} />
              </View>
            ) : focused ? (
              <CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: ["qr"] }} onBarcodeScanned={onScanned} />
            ) : null}
            {granted && <Viewfinder />}
          </Animated.View>

          <Text style={{ color: p.nightMuted, textAlign: "center", fontSize: 14 }}>
            {granted ? "Placez le QR code de la carte dans le cadre" : "Ou saisissez le numéro de la carte ci-dessous"}
          </Text>

          <Animated.View entering={FadeInDown.duration(500).delay(160)} style={[styles.manual, { backgroundColor: p.night2, borderColor: p.nightLine }]}>
            <Text style={[typo.label, { color: p.nightMuted }]}>Numéro de la carte</Text>
            <View style={styles.inputRow}>
              <TextInput
                value={manual}
                onChangeText={setManual}
                placeholder="ex. 8fK2-xQ…"
                placeholderTextColor="#5f5b56"
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="Numéro de la carte"
                onSubmitEditing={() => open(manual)}
                returnKeyType="go"
                style={[styles.input, { color: p.onInverse, borderColor: error ? p.danger : p.nightLine, fontFamily: "mono" }]}
              />
              <Pressable
                onPress={() => open(manual)}
                disabled={!manual.trim()}
                accessibilityRole="button"
                accessibilityLabel="Ouvrir la carte"
                style={({ pressed }) => [styles.go, { backgroundColor: p.accent, opacity: manual.trim() ? 1 : 0.35, transform: [{ scale: pressed ? 0.94 : 1 }] }]}
              >
                <Ionicons name="arrow-forward" size={22} color="#fff" />
              </Pressable>
            </View>
            {error ? <Text style={{ color: "#ff7b6e", fontSize: 13 }}>{error}</Text> : null}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/** Coins orange + ligne de balayage qui monte et descend. */
function Viewfinder() {
  const p = usePalette();
  const y = useSharedValue(0);
  const pulse = useSharedValue(1);
  useEffect(() => {
    y.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }), -1, true);
    pulse.value = withRepeat(withSequence(withTiming(1.03, { duration: 900 }), withTiming(1, { duration: 900 })), -1);
  }, [y, pulse]);
  const lineStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value * (FRAME - 4) }] }));
  const frameStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  const c = { position: "absolute" as const, width: 46, height: 46, borderColor: p.accent };
  return (
    <View pointerEvents="none" style={styles.finderWrap}>
      <Animated.View style={[styles.frame, frameStyle]}>
        <View style={[c, { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 18 }]} />
        <View style={[c, { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 18 }]} />
        <View style={[c, { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 18 }]} />
        <View style={[c, { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 18 }]} />
        <Animated.View style={[styles.scanLine, { backgroundColor: p.accent, shadowColor: p.accent }, lineStyle]} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "flex-end", gap: space.md },
  alert: { flexDirection: "row", gap: 12, padding: space.lg, borderRadius: radius.lg, borderWidth: 1 },
  camera: {
    aspectRatio: 1,
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
    borderRadius: radius.xl + 6,
    borderWidth: 1,
    overflow: "hidden",
    justifyContent: "center",
    backgroundColor: "#050506",
  },
  cameraMsg: { padding: 28, gap: 14, alignItems: "stretch" },
  camIcon: { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center", alignSelf: "center" },
  finderWrap: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  frame: { width: FRAME, height: FRAME },
  scanLine: { position: "absolute", left: 14, right: 14, height: 2, borderRadius: 1, shadowOpacity: 0.9, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } },
  manual: { borderRadius: radius.lg, borderWidth: 1, padding: space.lg, gap: space.md },
  inputRow: { flexDirection: "row", gap: 10 },
  input: { flex: 1, minHeight: 52, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: 16, fontSize: 16, backgroundColor: "#0f0f11" },
  go: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
});
