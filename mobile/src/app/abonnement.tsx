// Écran affiché quand l'abonnement du commerce n'est pas actif : l'appli est bloquée.
// Aucun achat ni lien de paiement dans les applis iPhone / Android (règles des stores) ;
// la version web propose le lien de paiement.
import { Redirect } from "expo-router";
import { useState } from "react";
import { Linking, Platform, View } from "react-native";
import { Text } from "@/ui/text";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import { toRemoteError } from "@/lib/useRemote";
import { Button, Notice, ScrollScreen } from "@/ui/components";
import { QamarMark } from "@/ui/logo";
import { space, type as typo, usePalette } from "@/ui/theme";
import { plural } from "@/lib/format";

export default function SubscriptionScreen() {
  const p = usePalette();
  const { session, ledger, setSubscription, logout, syncNow } = useStore();
  const [checking, setChecking] = useState(false);
  const [notice, setNotice] = useState<string>();

  if (!session) return <Redirect href="/login" />;
  if (session.subscription?.active !== false) return <Redirect href="/" />;
  const owner = session.staff.role === "owner";
  const pending = session.subscription.status === "pending";

  async function check() {
    if (!session) return;
    setChecking(true);
    setNotice(undefined);
    try {
      const { subscription } = await api.account(session.token);
      if (subscription) setSubscription(subscription);
      if (subscription?.active) void syncNow();
      else setNotice("L'abonnement n'est toujours pas actif.");
    } catch (e) {
      setNotice(toRemoteError(e).message);
    } finally {
      setChecking(false);
    }
  }

  async function pay() {
    if (!session) return;
    try {
      const { url } = await api.billing(session.token);
      await Linking.openURL(url);
    } catch (e) {
      setNotice(toRemoteError(e).message);
    }
  }

  return (
    <ScrollScreen>
      <View style={{ gap: space.md, marginTop: space.xl }}>
        <QamarMark width={52} />
        <Text style={typo.titleL}>
          {pending ? "Votre compte attend son activation" : "L'abonnement de ce commerce n'est pas actif"}
        </Text>
        <Text style={{ color: p.muted, fontSize: 16, lineHeight: 22 }}>
          {!owner
            ? "La caisse est en pause. Prévenez le responsable de la boutique."
            : pending
              ? "Votre compte est créé. L'application s'active dès que l'abonnement est réglé."
              : "La caisse, la carte de vos clients et les messages sont en pause tant que l'abonnement n'est pas réglé. Rien n'est perdu : vos clients et leurs tampons sont conservés."}
        </Text>
      </View>
      {ledger.pending.length > 0 && (
        <Notice tone="info" text={`${plural(ledger.pending.length, "passage est gardé", "passages sont gardés")} sur ce téléphone et ${ledger.pending.length > 1 ? "partiront" : "partira"} dès la réactivation.`} />
      )}
      {notice && <Notice tone="error" text={notice} />}
      {owner && Platform.OS === "web" && <Button label="Régler l'abonnement (25 € HT / mois)" icon="card-outline" onPress={() => void pay()} />}
      <Button label="Vérifier à nouveau" variant="secondary" icon="refresh-outline" onPress={() => void check()} loading={checking} />
      <Button label="Se déconnecter" variant="danger" icon="log-out-outline" onPress={() => void logout()} />
    </ScrollScreen>
  );
}
