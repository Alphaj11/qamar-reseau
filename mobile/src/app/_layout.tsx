import { Geist_400Regular, Geist_500Medium, Geist_600SemiBold, Geist_700Bold } from "@expo-google-fonts/geist";
import { GeistMono_400Regular, GeistMono_500Medium, GeistMono_600SemiBold } from "@expo-google-fonts/geist-mono";
import { useFonts } from "expo-font";
import { Stack, type ErrorBoundaryProps } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Pressable, View } from "react-native";
import { QamarMark } from "@/ui/logo";
import { Text } from "@/ui/text";
import { StoreProvider, useStore } from "@/lib/store";
import { usePalette } from "@/ui/theme";

SplashScreen.preventAutoHideAsync();

function Navigator() {
  const { ready } = useStore();
  const p = usePalette();
  // Si une police ne charge pas, on affiche quand même l'appli (police système)
  const [fontsLoaded, fontError] = useFonts({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
    GeistMono_400Regular,
    GeistMono_500Medium,
    GeistMono_600SemiBold,
  });
  const show = ready && (fontsLoaded || !!fontError);

  useEffect(() => {
    if (show) void SplashScreen.hideAsync();
  }, [show]);

  if (!show) return null;
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: p.bg },
          headerTintColor: p.text,
          headerTitleStyle: { fontFamily: "Geist_600SemiBold", fontSize: 17 },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: p.bg },
          headerBackTitle: "Retour",
        }}
      >
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="card/[serial]" options={{ title: "Passage en caisse" }} />
        <Stack.Screen name="customer/[serial]" options={{ title: "Fiche client" }} />
        <Stack.Screen name="clients" options={{ title: "Clients" }} />
        <Stack.Screen name="abonnement" options={{ headerShown: false, gestureEnabled: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <StoreProvider>
      <Navigator />
    </StoreProvider>
  );
}

/** Écran affiché si une page plante : jamais d'écran blanc, un bouton pour réessayer. */
export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  const p = usePalette();
  return (
    <View style={{ flex: 1, backgroundColor: p.bg, alignItems: "center", justifyContent: "center", padding: 32, gap: 16 }}>
      <QamarMark width={72} plate={p.inverse} />
      <Text style={{ color: p.text, fontSize: 24, fontWeight: "700", textAlign: "center" }}>
        Oups, un souci d&apos;affichage<Text style={{ color: p.accent, fontSize: 24, fontWeight: "700" }}>.</Text>
      </Text>
      <Text style={{ color: p.muted, fontSize: 15, lineHeight: 22, textAlign: "center" }}>
        Vos passages en caisse sont conservés sur le téléphone. Réessayez ; si le problème continue, fermez puis rouvrez l&apos;application.
      </Text>
      <Pressable
        onPress={() => void retry()}
        accessibilityRole="button"
        style={({ pressed }) => ({ backgroundColor: p.accent, borderRadius: 999, paddingHorizontal: 28, paddingVertical: 14, opacity: pressed ? 0.85 : 1 })}
      >
        <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}>Réessayer</Text>
      </Pressable>
    </View>
  );
}
