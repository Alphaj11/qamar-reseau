// Demande d'avis Google : après quelques visites, le client reçoit une invitation sur sa carte,
// et le lien reste au dos de la carte. Chaque client n'est sollicité qu'une fois.
import { useEffect, useState } from "react";
import { Linking, Switch, View } from "react-native";
import { Text } from "@/ui/text";
import { api } from "@/lib/api";
import { plural } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { ReviewSettings } from "@/lib/types";
import { toRemoteError, useRemote } from "@/lib/useRemote";
import { Button, ErrorMessage, Field, Loading, Notice, Row, Section, Segmented } from "@/ui/components";
import { space, usePalette } from "@/ui/theme";

const MAX = 150;
const VISITS = [2, 3, 5, 10];
const GOOGLE_URL = /^https:\/\/(g\.page|search\.google\.com|(www\.|maps\.)?google\.com|maps\.app\.goo\.gl|goo\.gl|g\.co)\//i;

export function ReviewSection() {
  const p = usePalette();
  const { session } = useStore();
  const { data, error, loading, reload, setData } = useRemote((token) => api.review(token));
  const [draft, setDraft] = useState<ReviewSettings>();
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string }>();

  useEffect(() => {
    const t = setTimeout(() => setDraft(data?.settings), 0);
    return () => clearTimeout(t);
  }, [data]);

  if (loading || (!draft && !error)) return <Loading />;
  if (error || !data || !draft) return <ErrorMessage error={error ?? { kind: "other", message: "Indisponible" }} onRetry={reload} />;

  const changed = JSON.stringify(draft) !== JSON.stringify(data.settings);
  const url = draft.url.trim();
  const urlError = url && !GOOGLE_URL.test(url) ? "Ce n'est pas un lien Google. Copiez celui de « Demander des avis »." : undefined;
  const missingUrl = draft.enabled && !url;

  async function save() {
    if (!session || !draft) return;
    setSaving(true);
    setNotice(undefined);
    try {
      const res = await api.updateReview(session.token, { ...draft, url });
      setData(res);
      setNotice({
        tone: "ok",
        text: res.settings.enabled
          ? `Activé. Vos clients seront invités après leur ${res.settings.afterVisits}e visite, et le lien apparaîtra au dos de leur carte.`
          : "Désactivé. Le lien a été retiré des cartes.",
      });
    } catch (e) {
      setNotice({ tone: "error", text: toRemoteError(e).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section title="Avis Google">
      <View style={{ padding: space.md, gap: space.md }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: p.text, fontWeight: "600", fontSize: 16 }}>Demander un avis</Text>
            <Text style={{ color: p.muted, fontSize: 13 }}>
              Après la {draft.afterVisits}e visite, le client reçoit une invitation. Une seule fois par client.
            </Text>
          </View>
          <Switch
            value={draft.enabled}
            onValueChange={(enabled) => {
              setDraft({ ...draft, enabled });
              setNotice(undefined);
            }}
            accessibilityLabel="Demander un avis Google"
          />
        </View>

        <Field
          label="Lien d'avis de votre fiche Google"
          placeholder="https://g.page/r/…/review"
          value={draft.url}
          onChangeText={(t) => setDraft({ ...draft, url: t })}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          error={urlError ?? (missingUrl ? "Ajoutez le lien pour pouvoir activer la demande." : undefined)}
          hint="Sur Google : votre fiche d'établissement › « Demander des avis » › copier le lien."
        />
        {url && !urlError ? (
          <Text onPress={() => void Linking.openURL(url)} accessibilityRole="link" style={{ color: p.primary, fontSize: 14, fontWeight: "600" }}>
            Tester le lien
          </Text>
        ) : null}

        <View style={{ gap: 6 }}>
          <Text style={{ color: p.text, fontWeight: "600", fontSize: 14 }}>Après combien de visites ?</Text>
          <Segmented options={VISITS.map((v) => ({ value: v, label: `${v}` }))} value={draft.afterVisits} onChange={(afterVisits) => setDraft({ ...draft, afterVisits })} />
        </View>

        <Field
          label="Message"
          value={draft.message}
          onChangeText={(t) => setDraft({ ...draft, message: t.slice(0, MAX) })}
          multiline
          hint={`${draft.message.length}/${MAX} caractères · envoyé aux clients qui ont accepté les offres`}
        />

        {notice && <Notice tone={notice.tone} text={notice.text} />}
        <Button
          label={changed ? "Enregistrer" : "Aucune modification"}
          icon="save-outline"
          onPress={() => void save()}
          loading={saving}
          disabled={!changed || !!urlError || missingUrl || draft.message.trim().length < 3}
        />
      </View>
      <Row
        title={data.asked ? `${plural(data.asked, "client invité", "clients invités")}` : "Aucun client invité pour le moment"}
        subtitle={
          data.asked
            ? `dont ${data.askedLast30Days} ces 30 derniers jours. Google ne dit pas qui a publié un avis : regardez votre fiche.`
            : "Les invitations partent au passage en caisse."
        }
        last
      />
    </Section>
  );
}
