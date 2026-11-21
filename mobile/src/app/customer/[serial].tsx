// Fiche client : solde, coordonnées, historique des passages.
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { RefreshControl, View } from "react-native";
import { api } from "@/lib/api";
import { describeOp, formatBirthday, formatDate, formatDateTime, plural } from "@/lib/format";
import { useStore } from "@/lib/store";
import { toRemoteError, useRemote } from "@/lib/useRemote";
import { Badge, Button, ErrorMessage, Loading, Notice, Row, ScrollScreen, Section, StatTile } from "@/ui/components";
import { confirm } from "@/ui/confirm";
import { space } from "@/ui/theme";

export default function CustomerScreen() {
  const { serial } = useLocalSearchParams<{ serial: string }>();
  const { ledger, session, syncNow } = useStore();
  const owner = session?.staff.role === "owner";
  const [deleteError, setDeleteError] = useState<string>();
  const { data, error, loading, refreshing, reload } = useRemote((token) => api.customer(token, serial), [serial]);
  const program = ledger.programs[0];

  if (loading) return <Loading />;
  if (error || !data) {
    return (
      <ScrollScreen>
        <ErrorMessage error={error ?? { kind: "other", message: "Client introuvable" }} onRetry={reload} />
      </ScrollScreen>
    );
  }
  const c = data.customer;
  const isPoints = program?.type === "points";

  // Droit à l'effacement (RGPD) : à la demande du client
  async function erase() {
    if (!session) return;
    const ok = await confirm(
      `Effacer ${c.firstName} ?`,
      "Sa carte, son historique et ses coordonnées seront supprimés définitivement. À faire seulement à la demande du client.",
      "Effacer",
      true,
    );
    if (!ok) return;
    try {
      await api.deleteCustomer(session.token, serial);
      void syncNow();
      router.back();
    } catch (e) {
      setDeleteError(toRemoteError(e).message);
    }
  }

  return (
    <ScrollScreen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} />}>
      <View style={{ flexDirection: "row", gap: space.md, flexWrap: "wrap" }}>
        <StatTile
          label={isPoints ? "Points" : "Tampons"}
          value={isPoints ? String(c.points) : `${c.stamps}/${program?.stampsRequired ?? "?"}`}
        />
        <StatTile label="Récompenses" value={String(c.rewardsAvailable)} hint={plural(c.rewardsRedeemed, "utilisée")} />
        <StatTile label="Passages" value={String(c.visits)} />
      </View>

      <Button
        label="Passage en caisse"
        icon="add-circle-outline"
        onPress={() => router.push({ pathname: "/card/[serial]", params: { serial } })}
      />

      <Section title="Client">
        <Row icon="person-outline" title={c.firstName} subtitle={`Inscrit le ${formatDate(c.createdAt)}`} />
        {c.email ? <Row icon="mail-outline" title={c.email} /> : null}
        {c.phone ? <Row icon="call-outline" title={c.phone} /> : null}
        {c.birthday ? <Row icon="gift-outline" title={`Anniversaire : ${formatBirthday(c.birthday)}`} /> : null}
        <Row
          icon="notifications-outline"
          title="Offres et messages"
          right={<Badge text={c.marketingConsent ? "Accepté" : "Refusé"} tone={c.marketingConsent ? "ok" : "neutral"} />}
        />
        <Row
          icon="wallet-outline"
          title="Apple Wallet"
          right={<Badge text={c.inAppleWallet ? "Installée" : "Non installée"} tone={c.inAppleWallet ? "ok" : "neutral"} />}
        />
        <Row icon="barcode-outline" title="N° de carte" right={c.serial} last />
      </Section>

      <Section title={`Historique · ${plural(data.history.length, "opération")}`}>
        {data.history.length === 0 ? (
          <Row title="Aucun passage pour le moment" last />
        ) : (
          data.history.map((h, i) => (
            <Row
              key={`${h.occurredAt}-${i}`}
              icon={h.kind === "reward" ? "gift-outline" : "checkmark-circle-outline"}
              title={describeOp(h.kind, h.amount)}
              subtitle={`${formatDateTime(h.occurredAt)} · ${h.by}`}
              last={i === data.history.length - 1}
            />
          ))
        )}
      </Section>

      {owner && (
        <>
          {deleteError && <Notice tone="error" text={deleteError} />}
          <Button label="Effacer ce client" variant="danger" icon="trash-outline" onPress={() => void erase()} />
        </>
      )}
    </ScrollScreen>
  );
}
