// Onglets : Accueil · Analyse · Scanner · Carte · Profil, dans la barre flottante Qamar.
// Les 5 onglets sont toujours là ; pour un vendeur, Analyse et Carte affichent « réservé au responsable ».
import { Redirect } from "expo-router";
import { Tabs } from "expo-router/js-tabs";
import { useStore } from "@/lib/store";
import { QamarTabBar, type TabSpec } from "@/ui/TabBar";
import { usePalette } from "@/ui/theme";

export default function TabsLayout() {
  const { session, ledger } = useStore();
  const p = usePalette();
  if (!session) return <Redirect href="/login" />;
  if (session.subscription?.active === false) return <Redirect href="/abonnement" />;
  const pending = ledger.pending.length;

  const specs: Record<string, TabSpec> = {
    index: { icon: "home-outline", activeIcon: "home", label: "Accueil" },
    analyse: { icon: "stats-chart-outline", activeIcon: "stats-chart", label: "Analyse" },
    scan: { icon: "scan-outline", activeIcon: "scan", label: "Scanner", badge: pending || undefined },
    carte: { icon: "card-outline", activeIcon: "card", label: "Carte" },
    profil: { icon: "person-outline", activeIcon: "person", label: "Profil" },
  };

  return (
    <Tabs
      tabBar={(props) => <QamarTabBar {...props} specs={specs} />}
      screenOptions={{
        headerShown: false,
        animation: "shift",
        sceneStyle: { backgroundColor: p.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Accueil" }} />
      <Tabs.Screen name="analyse" options={{ title: "Analyse" }} />
      <Tabs.Screen name="scan" options={{ title: "Scanner" }} />
      <Tabs.Screen name="carte" options={{ title: "Ma carte" }} />
      <Tabs.Screen name="profil" options={{ title: "Profil" }} />
    </Tabs>
  );
}
