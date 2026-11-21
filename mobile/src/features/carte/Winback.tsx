// Relance automatique des clients absents : une fois par jour, un message part sur la carte
// des clients qui ne sont pas venus depuis N jours. Un client n'est relancé qu'une fois par absence.
import { useEffect, useState } from "react";
import { Switch, View } from "react-native";
import { Text } from "@/ui/text";
import { api } from "@/lib/api";
import { plural } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { WinbackSettings } from "@/lib/types";
import { toRemoteError, useRemote } from "@/lib/useRemote";
import { Button, ErrorMessage, Field, Loading, Notice, Row, Section, Segmented } from "@/ui/components";
import { space, usePalette } from "@/ui/theme";

const MAX = 150;
const DAYS = [21, 30, 45, 60, 90];

export function WinbackSection() {
  const p = usePalette();
  const { session } = useStore();
  const { data, error, loading, reload, setData } = useRemote((token) => api.winback(token));
  const [draft, setDraft] = useState<WinbackSettings>();
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string }>();

  useEffect(() => {
    const t = setTimeout(() => setDraft(data?.settings), 0);
    return () => clearTimeout(t);
  }, [data]);

  if (loading || (!draft && !error)) return <Loading />;
  if (error || !data || !draft) return <ErrorMessage error={error ?? { kind: "other", message: "Indisponible" }} onRetry={reload} />;

  const changed = JSON.stringify(draft) !== JSON.stringify(data.settings);
  const { sent, returned } = data.last90Days;

  async function save(next: WinbackSettings) {
    if (!session) return;
    setSaving(true);
    setNotice(undefined);
    try {
      const res = await api.updateWinback(session.token, next);
      setData(res);
      setNotice({
        tone: "ok",
        text: res.settings.enabled
          ? "Relance activée. Les messages partent chaque matin vers 10 h."
          : "Relance désactivée. Aucun message ne partira.",
      });
    } catch (e) {
      setNotice({ tone: "error", text: toRemoteError(e).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section title="Relance des clients absents">
      <View style={{ padding: space.md, gap: space.md }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: p.text, fontWeight: "600", fontSize: 16 }}>Relance automatique</Text>
            <Text style={{ color: p.muted, fontSize: 13 }}>
              Un message part sur la carte des clients qui ne sont pas venus depuis {draft.days} jours.
            </Text>
          </View>
          <Switch
            value={draft.enabled}
            onValueChange={(enabled) => {
              setDraft({ ...draft, enabled });
              setNotice(undefined);
            }}
            accessibilityLabel="Relance automatique"
          />
        </View>

        <View style={{ gap: 6 }}>
          <Text style={{ color: p.text, fontWeight: "600", fontSize: 14 }}>Après combien de jours sans passage ?</Text>
          <Segmented options={DAYS.map((d) => ({ value: d, label: `${d} j` }))} value={draft.days} onChange={(days) => setDraft({ ...draft, days })} />
        </View>

        <Field
          label="Message"
          value={draft.message}
          onChangeText={(t) => setDraft({ ...draft, message: t.slice(0, MAX) })}
          multiline
          hint={`${draft.message.length}/${MAX} caractères · s'affiche en notification sur la carte`}
        />

        {notice && <Notice tone={notice.tone} text={notice.text} />}
        <Button
          label={changed ? "Enregistrer" : "Aucune modification"}
          icon="save-outline"
          onPress={() => void save(draft)}
          loading={saving}
          disabled={!changed || draft.message.trim().length < 3}
        />
      </View>

      <Row
        title={data.settings.enabled ? "Au prochain passage (chaque matin vers 10 h)" : "Si vous l'activez maintenant"}
        subtitle={
          data.dueNow
            ? `${plural(data.dueNow, "client")} recevr${data.dueNow > 1 ? "ont" : "a"} le message`
            : "Aucun client à relancer pour l'instant"
        }
      />
      <Row
        title="Ces 90 derniers jours"
        subtitle={
          sent
            ? `${plural(sent, "client relancé", "clients relancés")}, ${plural(returned, "revenu", "revenus")} dans les ${data.returnDays} jours`
            : "Aucune relance envoyée pour le moment"
        }
        last={!data.absentWithoutConsent}
      />
      {data.absentWithoutConsent > 0 && (
        <Row
          title={`${plural(data.absentWithoutConsent, "autre client absent", "autres clients absents")}`}
          subtitle="Ils n'ont pas accepté les offres : la loi interdit de leur écrire."
          last
        />
      )}
    </Section>
  );
}
