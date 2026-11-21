// Clients : liste, recherche, accès à la fiche (ouvert depuis l'accueil ou l'analyse).
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { RefreshControl, View } from "react-native";
import { Text } from "@/ui/text";
import { api } from "@/lib/api";
import { formatRelative, plural } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { CustomerRow } from "@/lib/types";
import { useRemote } from "@/lib/useRemote";
import { Badge, ErrorMessage, Field, Loading, Message, Row, ScrollScreen, Section } from "@/ui/components";
import { usePalette } from "@/ui/theme";

export default function Clients() {
  const p = usePalette();
  const { ledger } = useStore();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");

  // Recherche envoyée 300 ms après la dernière frappe
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const { data, error, loading, refreshing, reload } = useRemote((token) => api.customers(token, debounced), [debounced]);
  const program = ledger.programs[0];

  const balance = (c: CustomerRow) =>
    program?.type === "points" ? `${c.points} pts` : `${c.stamps}/${program?.stampsRequired ?? "?"}`;

  return (
    <ScrollScreen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} />}>
      <Field
        label="Rechercher"
        placeholder="Prénom, e-mail, téléphone ou n° de carte"
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
      />

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorMessage error={error} onRetry={reload} />
      ) : !data?.customers.length ? (
        <Message
          icon="people-outline"
          title={debounced ? "Aucun résultat" : "Pas encore de clients"}
          text={debounced ? "Essayez un autre nom ou numéro." : "Les clients apparaissent ici dès qu'ils s'inscrivent avec le QR code du comptoir."}
        />
      ) : (
        <Section title={plural(data.customers.length, "client")}>
          {data.customers.map((c, i) => (
            <Row
              key={c.serial}
              title={c.firstName}
              subtitle={`${plural(c.visits, "passage")} · dernier ${formatRelative(c.lastVisitAt)}`}
              right={
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  <Text style={{ color: p.text, fontWeight: "600" }}>{balance(c)}</Text>
                  {c.rewardsAvailable > 0 && <Badge text="Récompense" tone="ok" />}
                </View>
              }
              onPress={() => router.push({ pathname: "/customer/[serial]", params: { serial: c.serial } })}
              last={i === data.customers.length - 1}
            />
          ))}
        </Section>
      )}
    </ScrollScreen>
  );
}
