import { Redirect } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Linking, Platform, ScrollView, View } from "react-native";
import { Text } from "@/ui/text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { API_URL, OfflineError } from "@/lib/api";
import { BRAND } from "@/lib/brand";
import { useStore } from "@/lib/store";
import { Button, Field, Screen } from "@/ui/components";
import { QamarLogo } from "@/ui/logo";
import { type as typo, usePalette } from "@/ui/theme";

export default function Login() {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const { session, login, startDemo } = useStore();
  const [demoLoading, setDemoLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  if (session) return <Redirect href="/" />;

  async function submit() {
    setError(undefined);
    if (!email.trim() || !/^\d{4,8}$/.test(pin)) {
      setError("Saisissez votre e-mail et votre code (4 à 8 chiffres).");
      return;
    }
    setLoading(true);
    try {
      await login(email, pin);
    } catch (e) {
      setError(e instanceof OfflineError ? "Pas de connexion. La première connexion nécessite Internet." : (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function discover() {
    setError(undefined);
    setDemoLoading(true);
    try {
      await startDemo();
    } catch (e) {
      setError(e instanceof OfflineError ? "Pas de connexion. La démo nécessite Internet." : (e as Error).message);
    } finally {
      setDemoLoading(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24, paddingTop: insets.top + 24, gap: 28 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ gap: 28 }}>
            <QamarLogo size={44} />
            <View style={{ gap: 10 }}>
              <Text style={typo.display} accessibilityLabel={`${BRAND.appName}, la fidélité de votre boutique`}>
                La fidélité,{"\n"}à la manière <Text style={[typo.display, { color: p.accent }]}>Qamar.</Text>
              </Text>
              <Text style={{ color: p.muted, fontSize: 16, lineHeight: 22 }}>Connectez-vous avec le compte de votre boutique.</Text>
            </View>
          </View>
          <View style={{ gap: 16 }}>
            <Field
              label="E-mail"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="username"
            />
            <Field
              label="Code"
              value={pin}
              onChangeText={(t) => setPin(t.replace(/\D/g, "").slice(0, 8))}
              keyboardType="number-pad"
              secureTextEntry
              textContentType="password"
              onSubmitEditing={submit}
            />
            {error ? <Text style={{ color: p.danger, fontSize: 14 }}>{error}</Text> : null}
            <Button label="Se connecter" onPress={submit} loading={loading} />
            <Button label="Code oublié ?" variant="secondary" onPress={() => void Linking.openURL(`${API_URL}/code-oublie`)} />
          </View>
          <View style={{ gap: 10, borderTopWidth: 1, borderTopColor: p.line, paddingTop: 22 }}>
            <Button label="Découvrir l'appli" variant="secondary" icon="sparkles-outline" onPress={() => void discover()} loading={demoLoading} />
            <Text style={{ color: p.muted, fontSize: 13, lineHeight: 18, textAlign: "center" }}>
              Une boulangerie fictive pour tout essayer : caisse, studio de carte, statistiques. Rien n&apos;est enregistré.
            </Text>
          </View>
          {/* Offre et inscription : seulement sur le web. Les applis iPhone / Android ne renvoient
              vers aucun achat (règles App Store 3.1.3(f) et Google Play). */}
          {Platform.OS === "web" && (
            <View style={{ gap: 8, borderTopWidth: 1, borderTopColor: p.line, paddingTop: 20 }}>
              <Text style={typo.titleS}>Pas encore de compte ?</Text>
              <Text style={{ color: p.muted }}>Créez la carte de fidélité de votre commerce : 25 € HT / mois, sans engagement.</Text>
              <Button label="Créer ma carte commerçant" variant="secondary" onPress={() => void Linking.openURL(`${API_URL}/inscription`)} />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
