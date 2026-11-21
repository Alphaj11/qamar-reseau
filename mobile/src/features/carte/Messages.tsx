// Messages aux clients : un texte qui s'affiche en notification sur leur carte Wallet.
// Envoyé seulement aux clients qui ont accepté les offres (consentement RGPD).
import { useState } from "react";
import { View } from "react-native";
import { Text } from "@/ui/text";
import { api } from "@/lib/api";
import { formatDateTime, plural } from "@/lib/format";
import { useStore } from "@/lib/store";
import { toRemoteError, useRemote } from "@/lib/useRemote";
import { Button, ErrorMessage, Field, Loading, Notice, Row, Section } from "@/ui/components";
import { confirm } from "@/ui/confirm";
import { space, usePalette } from "@/ui/theme";
import { BirthdaySection } from "./Birthday";
import { ReviewSection } from "./Review";
import { WinbackSection } from "./Winback";

const MAX = 150;

const IDEAS = [
  "-20 % sur les pâtisseries ce week-end",
  "Nouveau : nos boissons d'hiver sont arrivées",
  "Double tampon jusqu'à dimanche",
];

export function MessagesSection() {
  const p = usePalette();
  const { session } = useStore();
  const { data, error, loading, reload, setData } = useRemote((token) => api.campaigns(token));
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string }>();

  if (loading) return <Loading />;
  if (error) return <ErrorMessage error={error} onRetry={reload} />;
  const left = data?.remainingToday ?? 0;

  async function send() {
    if (!session) return;
    const message = text.trim();
    const ok = await confirm("Envoyer ce message ?", `« ${message} »\n\nIl s'affichera en notification sur la carte de vos clients.`, "Envoyer");
    if (!ok) return;
    setSending(true);
    setNotice(undefined);
    try {
      const { campaign } = await api.sendCampaign(session.token, message);
      setData((d) => (d ? { ...d, campaigns: [campaign, ...d.campaigns], remainingToday: Math.max(0, d.remainingToday - 1) } : d));
      setText("");
      setNotice({ tone: "ok", text: `Message envoyé à ${plural(campaign.recipients, "client")}` });
    } catch (e) {
      setNotice({ tone: "error", text: toRemoteError(e).message });
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <WinbackSection />
      <ReviewSection />
      <BirthdaySection />
      <Section title="Nouveau message">
        <View style={{ padding: space.md, gap: space.md }}>
          <Field
            label="Message"
            placeholder="Ex. : -20 % sur les pâtisseries ce week-end !"
            value={text}
            onChangeText={(t) => setText(t.slice(0, MAX))}
            multiline
            hint={`${text.length}/${MAX} caractères · envoyé aux clients qui ont accepté les offres`}
          />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
            {IDEAS.map((idea) => (
              <Text
                key={idea}
                onPress={() => setText(idea)}
                accessibilityRole="button"
                style={{ color: p.text, borderColor: p.line, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, fontSize: 13 }}
              >
                {idea}
              </Text>
            ))}
          </View>
          <Text style={{ color: p.muted, fontSize: 13 }}>
            {left > 0
              ? `Encore ${plural(left, "message")} possible${left > 1 ? "s" : ""} aujourd'hui. Conseil : quelques messages par mois, pas plus, sinon vos clients coupent les notifications.`
              : "Limite atteinte pour aujourd'hui (3 messages par 24 h, au-delà les téléphones ne notifient plus)."}
          </Text>
          {notice && <Notice tone={notice.tone} text={notice.text} />}
          <Button label="Envoyer" icon="send-outline" onPress={send} loading={sending} disabled={text.trim().length < 3 || left === 0} />
        </View>
      </Section>

      <Section title="Messages envoyés">
        {!data?.campaigns.length ? (
          <Row title="Aucun message envoyé pour le moment" last />
        ) : (
          data.campaigns.map((c, i) => (
            <Row
              key={c.id}
              title={c.message}
              subtitle={`${formatDateTime(c.createdAt)} · ${plural(c.recipients, "destinataire")}`}
              last={i === data.campaigns.length - 1}
            />
          ))
        )}
      </Section>
    </>
  );
}
