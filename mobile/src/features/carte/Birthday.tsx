// Offre d'anniversaire : le jour J, un message sur la carte et, au choix, une récompense offerte.
// Le client donne son anniversaire (jour et mois) à l'inscription s'il le souhaite.
import { useEffect, useState } from "react";
import { Switch, View } from "react-native";
import { Text } from "@/ui/text";
import { api } from "@/lib/api";
import { plural } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { BirthdaySettings } from "@/lib/types";
import { toRemoteError, useRemote } from "@/lib/useRemote";
import { Button, ErrorMessage, Field, Loading, Notice, Row, Section } from "@/ui/components";
import { space, usePalette } from "@/ui/theme";

const MAX = 150;

function Toggle({ title, text, value, onChange }: { title: string; text: string; value: boolean; onChange: (v: boolean) => void }) {
  const p = usePalette();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: p.text, fontWeight: "600", fontSize: 16 }}>{title}</Text>
        <Text style={{ color: p.muted, fontSize: 13 }}>{text}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} accessibilityLabel={title} />
    </View>
  );
}

export function BirthdaySection() {
  const { session, ledger } = useStore();
  const { data, error, loading, reload, setData } = useRemote((token) => api.birthday(token));
  const [draft, setDraft] = useState<BirthdaySettings>();
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string }>();

  useEffect(() => {
    const t = setTimeout(() => setDraft(data?.settings), 0);
    return () => clearTimeout(t);
  }, [data]);

  if (loading || (!draft && !error)) return <Loading />;
  if (error || !data || !draft) return <ErrorMessage error={error ?? { kind: "other", message: "Indisponible" }} onRetry={reload} />;

  const changed = JSON.stringify(draft) !== JSON.stringify(data.settings);
  const reward = ledger.programs[0]?.rewardLabel;

  async function save() {
    if (!session || !draft) return;
    setSaving(true);
    setNotice(undefined);
    try {
      const res = await api.updateBirthday(session.token, draft);
      setData(res);
      setNotice({
        tone: "ok",
        text: res.settings.enabled
          ? "Activé. La page d'inscription demande maintenant l'anniversaire (facultatif). Les clients sont fêtés le matin du jour J."
          : "Désactivé. L'anniversaire n'est plus demandé à l'inscription.",
      });
    } catch (e) {
      setNotice({ tone: "error", text: toRemoteError(e).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section title="Anniversaire">
      <View style={{ padding: space.md, gap: space.md }}>
        <Toggle
          title="Offre d'anniversaire"
          text="Le matin de son anniversaire, le client reçoit un message sur sa carte. Une fois par an."
          value={draft.enabled}
          onChange={(enabled) => {
            setDraft({ ...draft, enabled });
            setNotice(undefined);
          }}
        />
        <Toggle
          title="Offrir une récompense"
          text={`Ajoute une récompense sur sa carte${reward ? ` (« ${reward} »)` : ""}, à utiliser en caisse comme les autres.`}
          value={draft.gift}
          onChange={(gift) => setDraft({ ...draft, gift })}
        />
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
          onPress={() => void save()}
          loading={saving}
          disabled={!changed || draft.message.trim().length < 3}
        />
      </View>
      <Row
        title={data.known ? `${plural(data.known, "client a", "clients ont")} donné leur anniversaire` : "Aucun anniversaire connu pour le moment"}
        subtitle={
          data.known
            ? `${plural(data.thisMonth, "anniversaire")} ce mois-ci · ${plural(data.celebratedThisYear, "client fêté", "clients fêtés")} cette année`
            : "Il est demandé à l'inscription, une fois l'offre activée."
        }
        last
      />
    </Section>
  );
}
