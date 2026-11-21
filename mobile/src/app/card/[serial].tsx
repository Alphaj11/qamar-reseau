// Passage en caisse : ajouter des tampons / points, utiliser une récompense. Fonctionne hors ligne.
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { canUseUnknownCard, displayedCard, programOf, unknownCard } from "@/lib/ledger";
import { pointsForAmount } from "@/lib/rules";
import { useStore } from "@/lib/store";
import type { CardView, OpKind } from "@/lib/types";
import { plural } from "@/lib/format";
import { Button, CardPreview, Field, Loading, Message, Notice, ScrollScreen, Section, Stepper, SyncStatus } from "@/ui/components";
import { space } from "@/ui/theme";

export default function CardScreen() {
  const { serial } = useLocalSearchParams<{ serial: string }>();
  const { session, ledger, online, lookup, record } = useStore();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [qty, setQty] = useState(1);
  const [euros, setEuros] = useState("");
  const [feedback, setFeedback] = useState<{ tone: "ok" | "error"; text: string }>();

  useEffect(() => {
    let alive = true;
    void lookup(serial).then((c) => {
      if (!alive) return;
      setNotFound(!c);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [serial, lookup]);

  // Hors ligne, une carte créée depuis la dernière synchro n'est pas encore dans le cache :
  // on l'accepte comme "Nouveau client" (le serveur vérifiera à la synchro).
  const card: CardView | undefined =
    displayedCard(ledger, serial) ??
    (notFound && !online && canUseUnknownCard(ledger) ? unknownCard(ledger, serial) : undefined);
  const program = card ? programOf(ledger, card) : undefined;

  if (loading) return <Loading />;

  if (!card || !program) {
    return (
      <ScrollScreen>
        <Message
          icon="help-circle-outline"
          title="Carte introuvable"
          text="Cette carte n'appartient pas à votre boutique, ou elle vient d'être créée et votre téléphone est hors ligne."
          action={<Button label="Scanner une autre carte" onPress={() => router.back()} />}
        />
      </ScrollScreen>
    );
  }

  const isStamps = program.type === "stamps";
  const pts = pointsForAmount(Number.parseFloat(euros.replace(",", ".")) || 0, program.pointsPerEuro);
  const goal = isStamps ? program.stampsRequired : program.pointsRequired;
  const value = isStamps ? card.stamps : card.points;
  const pendingHere = ledger.pending.filter((o) => o.serial === serial).length;

  function act(kind: OpKind, amount: number, success: string) {
    const r = record(serial, kind, amount);
    setFeedback(r.error ? { tone: "error", text: r.error } : { tone: "ok", text: success });
    if (!r.error) {
      setQty(1);
      setEuros("");
    }
  }

  return (
    <ScrollScreen>
      <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
        <SyncStatus />
      </View>

      <CardPreview
        merchantName={program.merchantName}
        title={card.firstName}
        type={program.type}
        value={value}
        goal={goal}
        rewardLabel={`${isStamps ? `${value}/${goal} tampons` : `Encore ${goal - value} pts`} · ${program.rewardLabel}`}
        bgColor={program.bgColor}
        fgColor={program.fgColor}
        accentColor={program.accentColor}
        stampIcon={program.stampIcon}
        pattern={program.pattern}
        logo={program.logo}
        footer={pendingHere ? `${plural(pendingHere, "passage")} pas encore envoyé${pendingHere > 1 ? "s" : ""}` : undefined}
      />

      {feedback && <Notice tone={feedback.tone} text={feedback.text} />}

      {card.rewardsAvailable > 0 && (
        <Section title={`${plural(card.rewardsAvailable, "récompense disponible", "récompenses disponibles")}`}>
          <View style={{ padding: space.md, gap: space.md }}>
            <Notice tone="info" text={program.rewardLabel} />
            <Button
              label="Utiliser une récompense"
              icon="gift-outline"
              onPress={() => act("reward", 1, "Récompense utilisée")}
              color={program.accentColor}
              textColor={program.bgColor}
            />
          </View>
        </Section>
      )}

      {isStamps ? (
        <Section title="Ajouter des tampons">
          <View style={{ padding: space.md, gap: space.md }}>
            <Stepper value={qty} onChange={setQty} min={1} max={goal} label="Tampons" />
            <Button label={`Ajouter ${plural(qty, "tampon")}`} onPress={() => act("stamp", qty, `+${plural(qty, "tampon")}`)} />
          </View>
        </Section>
      ) : (
        <Section title="Ajouter des points">
          <View style={{ padding: space.md, gap: space.md }}>
            <Field
              label="Montant de l'achat (€)"
              value={euros}
              onChangeText={(t) => setEuros(t.replace(/[^\d.,]/g, ""))}
              keyboardType="decimal-pad"
              placeholder="0,00"
              hint={`${program.pointsPerEuro} point(s) par euro`}
            />
            <Button
              label={pts > 0 ? `Ajouter ${plural(pts, "point")}` : "Ajouter des points"}
              onPress={() => act("points", pts, `+${plural(pts, "point")}`)}
              disabled={pts < 1}
            />
          </View>
        </Section>
      )}

      {session?.staff && (
        <Button
          label="Voir la fiche client"
          variant="secondary"
          icon="person-outline"
          onPress={() => router.push({ pathname: "/customer/[serial]", params: { serial } })}
        />
      )}
      <Button label="Scanner un autre client" variant="secondary" icon="qr-code-outline" onPress={() => router.back()} />
    </ScrollScreen>
  );
}
