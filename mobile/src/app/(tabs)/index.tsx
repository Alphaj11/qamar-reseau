// Onglet Accueil : la journée en un coup d'œil, les raccourcis, et les premiers pas d'un nouveau commerce.
import { router } from "expo-router";
import { RefreshControl, StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Text } from "@/ui/text";
import { api } from "@/lib/api";
import { describeOp, formatRelative, plural } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Home } from "@/lib/types";
import { useRemote } from "@/lib/useRemote";
import { Button, DemoBanner, ErrorMessage, Loading, Notice, Row, ScrollScreen, Section, SyncStatus } from "@/ui/components";
import { QamarMark } from "@/ui/logo";
import { radius, space, type as typo, usePalette } from "@/ui/theme";

export default function HomeScreen() {
  const p = usePalette();
  const { session, ledger, logout } = useStore();
  const owner = session?.staff.role === "owner";
  const { data, error, loading, refreshing, reload } = useRemote((token) => api.home(token));
  const firstName = session?.staff.name.split(" ")[0] ?? "";
  const pastDue = session?.subscription?.status === "past_due";

  return (
    <ScrollScreen
      tabs
      title={`Bonjour ${firstName}`}
      eyebrow={data?.merchantName ?? ledger.merchantName}
      right={<SyncStatus />}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={p.accent} />}
    >
      {session?.demo && <DemoBanner onExit={() => void logout()} />}

      {pastDue && owner && (
        <Notice tone="error" text="Le dernier paiement de l'abonnement a échoué. Mettez à jour votre moyen de paiement pour éviter une coupure." />
      )}

      <Button label="Scanner une carte" icon="scan-outline" onPress={() => router.navigate("/scan")} />

      {loading ? (
        <Loading />
      ) : error || !data ? (
        <>
          <ErrorMessage error={error ?? { kind: "other", message: "Indisponible" }} onRetry={reload} />
          {ledger.pending.length > 0 && (
            <Notice tone="info" text={`${plural(ledger.pending.length, "passage")} enregistré${ledger.pending.length > 1 ? "s" : ""} sur ce téléphone, envoi au retour du réseau.`} />
          )}
        </>
      ) : (
        <HomeContent data={data} owner={owner} />
      )}
    </ScrollScreen>
  );
}

function HomeContent({ data, owner }: { data: Home; owner: boolean }) {
  const diff = data.today.visits - data.yesterday.visits;
  const vsYesterday = diff === 0 ? "comme hier" : `${diff > 0 ? "+" : "−"}${Math.abs(diff)} par rapport à hier`;
  const steps = [
    { done: data.onboarding.customized, title: "Personnaliser la carte", subtitle: "Couleurs, nom, récompense", section: "apparence" },
    { done: data.onboarding.location, title: "Ajouter l'adresse de la boutique", subtitle: "La carte s'affiche quand un client passe à côté", section: "proximite" },
    { done: data.onboarding.firstCustomer, title: "Inscrire un premier client", subtitle: "Imprimez le QR code et posez-le en caisse", section: "qr" },
    { done: data.onboarding.firstVisit, title: "Faire un premier passage", subtitle: "Scannez la carte d'un client", section: undefined },
  ];
  const todo = steps.filter((s) => !s.done).length;

  return (
    <>
      <TodayCard
        visits={data.today.visits}
        vsYesterday={vsYesterday}
        newCustomers={data.today.newCustomers}
        customers={data.customers}
        rewards={data.today.rewardsRedeemed}
        rewardsPending={data.rewardsPending}
      />

      {owner && todo > 0 && (
        <Section title={`Premiers pas · ${steps.length - todo}/${steps.length}`}>
          {steps.map((s, i) => (
            <Row
              key={s.title}
              icon={s.done ? "checkmark-circle" : "ellipse-outline"}
              title={s.title}
              subtitle={s.done ? "Fait" : s.subtitle}
              onPress={
                s.done
                  ? undefined
                  : () => (s.section ? router.navigate({ pathname: "/carte", params: { section: s.section } }) : router.navigate("/scan"))
              }
              last={i === steps.length - 1}
            />
          ))}
        </Section>
      )}

      <Section title="Raccourcis">
        <Row icon="people-outline" title="Clients" subtitle="Rechercher, voir l'historique" onPress={() => router.push("/clients")} last={!owner} />
        {owner && (
          <>
            <Row
              icon="chatbubble-ellipses-outline"
              title="Envoyer un message"
              subtitle="Une promo, une nouveauté"
              onPress={() => router.navigate({ pathname: "/carte", params: { section: "messages" } })}
            />
            <Row
              icon="qr-code-outline"
              title="QR code d'inscription"
              subtitle="Afficher, imprimer, partager"
              onPress={() => router.navigate({ pathname: "/carte", params: { section: "qr" } })}
              last
            />
          </>
        )}
      </Section>

      <Section title="Activité récente">
        {data.recent.length === 0 ? (
          <Row title="Aucun passage pour le moment" last />
        ) : (
          data.recent.map((r, i) => (
            <Row
              key={r.id}
              icon={r.kind === "reward" ? "gift-outline" : "checkmark-circle-outline"}
              title={`${r.firstName} · ${describeOp(r.kind, r.amount)}`}
              subtitle={`${formatRelative(r.occurredAt)} · ${r.by}`}
              onPress={() => router.push({ pathname: "/customer/[serial]", params: { serial: r.serial } })}
              last={i === data.recent.length - 1}
            />
          ))
        )}
      </Section>
    </>
  );
}

/** Carte « Aujourd'hui » : le bloc nuit de Qamar, avec le passage du jour en grand. */
function TodayCard(props: { visits: number; vsYesterday: string; newCustomers: number; customers: number; rewards: number; rewardsPending: number }) {
  const p = usePalette();
  return (
    <Animated.View entering={FadeInDown.duration(500).delay(80)} style={[styles.today, { backgroundColor: p.night }]}>
      <View style={styles.todayHead}>
        <Text style={[typo.label, { color: p.nightMuted }]}>Aujourd&apos;hui</Text>
        <QamarMark width={34} plate={p.night2} />
      </View>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 10 }}>
        <Text style={{ color: p.onInverse, fontSize: 64, fontWeight: "700", letterSpacing: -2.5, lineHeight: 66, fontVariant: ["tabular-nums"] }}>
          {props.visits}
        </Text>
        <View style={{ paddingBottom: 10, gap: 2 }}>
          <Text style={{ color: p.onInverse, fontSize: 16, fontWeight: "600" }}>{props.visits > 1 ? "passages" : "passage"}</Text>
          <Text style={{ color: p.accentLight, fontSize: 12, fontFamily: "mono" }}>{props.vsYesterday}</Text>
        </View>
      </View>
      <View style={[styles.todayRow, { borderTopColor: p.nightLine }]}>
        <TodayFigure label="Nouveaux clients" value={props.newCustomers} hint={`${plural(props.customers, "client")} au total`} />
        <View style={{ width: 1, backgroundColor: p.nightLine }} />
        <TodayFigure label="Récompenses" value={props.rewards} hint={`${props.rewardsPending} en attente`} />
      </View>
    </Animated.View>
  );
}

function TodayFigure({ label, value, hint }: { label: string; value: number; hint: string }) {
  const p = usePalette();
  return (
    <View style={{ flex: 1, gap: 4 }} accessibilityLabel={`${label} : ${value}, ${hint}`}>
      <Text style={[typo.label, { color: p.nightMuted }]}>{label}</Text>
      <Text style={{ color: p.onInverse, fontSize: 26, fontWeight: "600", letterSpacing: -0.6 }}>{value}</Text>
      <Text style={{ color: p.nightMuted, fontSize: 12 }}>{hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  today: { borderRadius: radius.xl, padding: space.xl, gap: space.lg, overflow: "hidden" },
  todayHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  todayRow: { flexDirection: "row", gap: space.lg, borderTopWidth: 1, paddingTop: space.lg },
});
