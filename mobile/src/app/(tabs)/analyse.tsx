// Onglet Analyse (responsable) : les chiffres du programme de fidélité.
// Tout est mesuré (passages scannés en caisse), sauf le chiffre d'affaires, estimé à partir du panier moyen.
import { router } from "expo-router";
import { useState } from "react";
import { RefreshControl, StyleSheet, View } from "react-native";
import { Text } from "@/ui/text";
import { api } from "@/lib/api";
import { formatDate, formatDateTime, formatNumber, plural } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Stats } from "@/lib/types";
import { toRemoteError, useRemote } from "@/lib/useRemote";
import { NumberField } from "@/features/carte/editor";
import { ExportPanel } from "@/features/export/ExportPanel";
import { Bars, Button, ErrorMessage, Loading, Notice, OwnerOnly, Row, ScrollScreen, Section, Segmented, StatTile, trend } from "@/ui/components";
import Ionicons from "@expo/vector-icons/Ionicons";
import { space, usePalette } from "@/ui/theme";

const PERIODS = [
  { value: 7, label: "7 jours" },
  { value: 30, label: "30 jours" },
  { value: 90, label: "90 jours" },
];

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];
const euros = (n: number) => `${formatNumber(n)} €`;

export default function AnalyseScreen() {
  const { session } = useStore();
  if (session?.staff.role !== "owner") {
    return (
      <ScrollScreen tabs title="Analyse" eyebrow="Votre fidélité en chiffres">
        <OwnerOnly what="Les statistiques du commerce" />
      </ScrollScreen>
    );
  }
  return <Analyse />;
}

function Analyse() {
  const p = usePalette();
  const [days, setDays] = useState(30);
  const { data, error, loading, refreshing, reload, setData } = useRemote((token) => api.stats(token, days), [days]);

  return (
    <ScrollScreen tabs title="Analyse" eyebrow="Votre fidélité en chiffres" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} />}>
      <Segmented options={PERIODS} value={days} onChange={setDays} />
      {loading ? (
        <Loading />
      ) : error || !data ? (
        <ErrorMessage error={error ?? { kind: "other", message: "Aucune donnée" }} onRetry={reload} />
      ) : (
        <>
        {data.customers === 0 && data.visits === 0 && data.previous.visits === 0 ? (
          <EmptyAnalyse />
        ) : (
        <Dashboard data={data} onBasketSaved={(averageBasket) => setData((d) => (d ? { ...d, averageBasket, estimatedRevenue: Math.round(d.visits * averageBasket) } : d))} />
        )}
        <Section title={`Exporter mes données · ${days} jours`}>
          <View style={{ padding: space.md, gap: space.md }}>
            <Text style={{ color: p.muted, fontSize: 13, lineHeight: 18 }}>
              Pour travailler sur ordinateur ou envoyer à votre comptable. La période choisie en haut s&apos;applique aux passages.
            </Text>
            <ExportPanel days={days} />
          </View>
        </Section>
        </>
      )}
    </ScrollScreen>
  );
}

function Dashboard({ data, onBasketSaved }: { data: Stats; onBasketSaved: (v: number) => void }) {
  const p = usePalette();
  const { ledger } = useStore();
  const isPoints = ledger.programs[0]?.type === "points";
  const optInRate = data.customers ? Math.round((data.optIn / data.customers) * 100) : 0;
  // Heures d'ouverture typiques : 7 h à 22 h
  const hours = data.byHour.slice(7, 23).map((value, i) => ({ label: i % 3 === 0 ? `${i + 7}h` : "", value }));

  return (
    <>
      <View style={styles.grid}>
        <StatTile label="Passages" value={formatNumber(data.visits)} hint={trend(data.visits, data.previous.visits)} />
        <StatTile label="Clients venus" value={formatNumber(data.activeCustomers)} hint={trend(data.activeCustomers, data.previous.activeCustomers)} />
        <StatTile label="Nouveaux clients" value={formatNumber(data.newCustomers)} hint={trend(data.newCustomers, data.previous.newCustomers)} />
        <StatTile label="Récompenses utilisées" value={formatNumber(data.rewardsRedeemed)} hint={data.rewardsPending ? `${plural(data.rewardsPending, "gagnée", "gagnées")}, pas encore ${data.rewardsPending > 1 ? "utilisées" : "utilisée"}` : "Aucune en attente"} />
      </View>

      {data.visits > 0 || data.averageBasket !== null ? <RevenueCard data={data} onSaved={onBasketSaved} /> : null}

      <Section title="Fidélité">
        <View style={styles.grid2}>
          <StatTile
            label="Taux de retour"
            value={data.returningRate === null ? "—" : `${data.returningRate} %`}
            hint="clients revenus au moins 2 fois"
          />
          <StatTile
            label="Passages par client"
            value={data.avgVisitsPerActive === null ? "—" : String(data.avgVisitsPerActive).replace(".", ",")}
            hint="sur la période"
          />
        </View>
        <Row
          icon="alarm-outline"
          title={`${plural(data.inactiveCustomers, "client")} à relancer`}
          subtitle="Pas venus depuis 30 jours. Un message peut les faire revenir."
          onPress={() => router.navigate({ pathname: "/carte", params: { section: "messages" } })}
          last
        />
      </Section>

      <Section title="Passages par jour (14 derniers jours)">
        <View style={{ padding: space.md }}>
          <Bars data={data.daily.map((d) => ({ label: formatDate(d.date), value: d.visits }))} description="Passages par jour" />
        </View>
      </Section>

      <Section title="Vos jours et heures d'affluence">
        <View style={{ padding: space.md, gap: space.lg }}>
          <Bars data={data.byWeekday.map((value, i) => ({ label: WEEKDAYS[i], value }))} allLabels description="Passages par jour de la semaine" />
          <Bars data={hours} allLabels description="Passages par heure" />
          <Text style={{ color: p.muted, fontSize: 13 }}>Utile pour choisir quand envoyer un message (juste avant un creux).</Text>
        </View>
      </Section>

      <Section title="Meilleurs clients de la période">
        {data.topCustomers.length === 0 ? (
          <Row title="Pas encore de passages sur la période" last />
        ) : (
          data.topCustomers.map((c, i) => (
            <Row
              key={c.serial}
              icon="ribbon-outline"
              title={c.firstName}
              right={plural(c.visits, "passage")}
              onPress={() => router.push({ pathname: "/customer/[serial]", params: { serial: c.serial } })}
              last={i === data.topCustomers.length - 1}
            />
          ))
        )}
      </Section>

      <Section title="Effet des messages (retour sous 7 jours)">
        {data.campaigns.length === 0 ? (
          <Row title="Aucun message envoyé" subtitle="Les résultats s'afficheront ici." last />
        ) : (
          data.campaigns.map((c, i) => (
            <Row
              key={c.id}
              title={c.message}
              subtitle={`${formatDateTime(c.createdAt)} · ${c.returned}/${c.recipients} revenus`}
              last={i === data.campaigns.length - 1}
            />
          ))
        )}
      </Section>

      <Section title="Cartes et consentement">
        <View style={styles.grid2}>
          <StatTile label="Clients inscrits" value={formatNumber(data.customers)} />
          <StatTile label="Acceptent les messages" value={`${optInRate} %`} hint={`${data.optIn} sur ${data.customers}`} />
          <StatTile label="Dans Apple Wallet" value={formatNumber(data.inAppleWallet)} />
          <StatTile label={isPoints ? "Points donnés" : "Tampons donnés"} value={formatNumber(isPoints ? data.pointsGiven : data.stampsGiven)} />
        </View>
      </Section>
    </>
  );
}

/** Avant le premier client : on montre ce qui s'affichera ici, plutôt qu'un mur de zéros. */
function EmptyAnalyse() {
  const p = usePalette();
  const items: { icon: "trending-up-outline" | "repeat-outline" | "time-outline" | "ribbon-outline"; title: string; text: string }[] = [
    { icon: "trending-up-outline", title: "Vos passages jour après jour", text: "Combien de clients utilisent la carte, et la tendance." },
    { icon: "repeat-outline", title: "Votre taux de retour", text: "La part de clients qui reviennent : le vrai effet de la fidélité." },
    { icon: "time-outline", title: "Vos heures d'affluence", text: "Pour choisir le bon moment pour envoyer une offre." },
    { icon: "ribbon-outline", title: "Vos meilleurs clients", text: "Ceux qui reviennent le plus, à remercier." },
  ];
  return (
    <View style={[styles.empty, { backgroundColor: p.night }]}>
      <View style={{ gap: 6 }}>
        <Text style={{ color: p.accentLight, fontSize: 11, fontFamily: "mono", letterSpacing: 1.2, textTransform: "uppercase" }}>Bientôt ici</Text>
        <Text style={{ color: p.onInverse, fontSize: 24, fontWeight: "700", letterSpacing: -0.6, lineHeight: 28 }}>
          Vos chiffres apparaissent dès le premier client inscrit.
        </Text>
      </View>
      <View style={{ gap: space.lg }}>
        {items.map((it) => (
          <View key={it.title} style={{ flexDirection: "row", gap: space.md, alignItems: "flex-start" }}>
            <View style={[styles.emptyIcon, { backgroundColor: p.night2 }]}>
              <Ionicons name={it.icon} size={18} color={p.accentLight} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: p.onInverse, fontWeight: "600", fontSize: 15 }}>{it.title}</Text>
              <Text style={{ color: p.nightMuted, fontSize: 13, lineHeight: 18 }}>{it.text}</Text>
            </View>
          </View>
        ))}
      </View>
      <Button label="Afficher mon QR code d'inscription" icon="qr-code-outline" onPress={() => router.navigate({ pathname: "/carte", params: { section: "qr" } })} />
    </View>
  );
}

/** Chiffre d'affaires estimé = passages × panier moyen saisi par le commerçant. */
function RevenueCard({ data, onSaved }: { data: Stats; onSaved: (v: number) => void }) {
  const p = usePalette();
  const { session } = useStore();
  const [editing, setEditing] = useState(data.averageBasket === null);
  const [basket, setBasket] = useState(data.averageBasket ?? 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  async function save() {
    if (!session) return;
    setSaving(true);
    setError(undefined);
    try {
      await api.updateSettings(session.token, { averageBasket: basket });
      onSaved(basket);
      setEditing(false);
    } catch (e) {
      setError(toRemoteError(e).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section title="Chiffre d'affaires des passages avec la carte">
      <View style={{ padding: space.md, gap: space.md }}>
        {data.estimatedRevenue !== null && !editing ? (
          <>
            <Text style={{ color: p.text, fontSize: 30, fontWeight: "700" }}>≈ {euros(data.estimatedRevenue)}</Text>
            <Text style={{ color: p.muted, fontSize: 13 }}>
              Estimation : {formatNumber(data.visits)} passages × {euros(data.averageBasket ?? 0)} de panier moyen. Ce n&apos;est pas un
              gain en plus : une partie de ces clients serait venue sans la carte. Suivez surtout le taux de retour.
            </Text>
            <Button label="Modifier le panier moyen" variant="secondary" onPress={() => setEditing(true)} />
          </>
        ) : (
          <>
            <Text style={{ color: p.muted, fontSize: 13 }}>
              Indiquez votre panier moyen pour estimer ce que rapportent les clients qui utilisent la carte.
            </Text>
            <NumberField label="Panier moyen (€)" value={basket} onChange={setBasket} decimal />
            {error && <Notice tone="error" text={error} />}
            <Button label="Enregistrer" onPress={() => void save()} loading={saving} disabled={!(basket > 0)} />
          </>
        )}
      </View>
    </Section>
  );
}

const styles = StyleSheet.create({
  empty: { borderRadius: 28, padding: space.xl, gap: space.xl },
  emptyIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.md },
  grid2: { flexDirection: "row", flexWrap: "wrap", gap: space.md, padding: space.md },
});
