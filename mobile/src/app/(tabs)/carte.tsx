// Onglet Carte (responsable) : le studio de la carte de fidélité.
// Apparence et offre (avec aperçu en direct), QR code d'inscription, messages aux clients, proximité.
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import type { ProgramSettings } from "@/lib/types";
import { toRemoteError, useRemote } from "@/lib/useRemote";
import { AppearanceSection, HEX, OfferSection, ProximitySection } from "@/features/carte/editor";
import { MessagesSection } from "@/features/carte/Messages";
import { ShareSection } from "@/features/carte/Share";
import { Button, CardPreview, Chips, ErrorMessage, Loading, Notice, OwnerOnly, ScrollScreen } from "@/ui/components";
import { space } from "@/ui/theme";

type CarteSection = "apparence" | "offre" | "qr" | "messages" | "proximite";

const SECTIONS: { value: CarteSection; label: string; icon: "color-palette-outline" | "gift-outline" | "qr-code-outline" | "chatbubble-ellipses-outline" | "location-outline" }[] = [
  { value: "apparence", label: "Apparence", icon: "color-palette-outline" },
  { value: "offre", label: "Offre", icon: "gift-outline" },
  { value: "qr", label: "QR code", icon: "qr-code-outline" },
  { value: "messages", label: "Messages", icon: "chatbubble-ellipses-outline" },
  { value: "proximite", label: "Proximité", icon: "location-outline" },
];

const isSection = (v: unknown): v is CarteSection => SECTIONS.some((s) => s.value === v);

export default function CarteScreen() {
  const { session } = useStore();
  if (session?.staff.role !== "owner") {
    return (
      <ScrollScreen tabs title="Ma carte" eyebrow="Studio">
        <OwnerOnly what="Le studio de la carte" />
      </ScrollScreen>
    );
  }
  return <Carte />;
}

function Carte() {
  const params = useLocalSearchParams<{ section?: string }>();
  const [section, setSection] = useState<CarteSection>(isSection(params.section) ? params.section : "apparence");

  // Arrivée depuis l'accueil avec une section précise (ex. « Ajouter votre boutique »)
  useEffect(() => {
    const t = setTimeout(() => isSection(params.section) && setSection(params.section), 0);
    return () => clearTimeout(t);
  }, [params.section]);

  return (
    <ScrollScreen tabs title="Ma carte" eyebrow="Studio">
      <Chips options={SECTIONS} value={section} onChange={setSection} />
      {section === "messages" ? <MessagesSection /> : section === "qr" ? <QrPanel /> : <Editor section={section} />}
    </ScrollScreen>
  );
}

function QrPanel() {
  const { ledger } = useStore();
  const { data, error, loading, reload } = useRemote((token) => api.account(token));
  if (loading) return <Loading />;
  if (error || !data) return <ErrorMessage error={error ?? { kind: "other", message: "Indisponible" }} onRetry={reload} />;
  return <ShareSection account={data} merchantName={ledger.merchantName} />;
}

/** Apparence, offre et proximité partagent le même brouillon et le même bouton Enregistrer. */
function Editor({ section }: { section: "apparence" | "offre" | "proximite" }) {
  const { session, ledger, syncNow } = useStore();
  const { data, error, loading, reload, setData } = useRemote((token) => api.settings(token));
  const [draft, setDraft] = useState<ProgramSettings>();
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string }>();

  // Le brouillon repart des réglages serveur à chaque chargement
  useEffect(() => {
    const t = setTimeout(() => setDraft(data?.settings), 0);
    return () => clearTimeout(t);
  }, [data]);

  if (loading || (!draft && !error)) return <Loading />;
  if (error || !draft || !data) {
    return <ErrorMessage error={error ?? { kind: "other", message: "Réglages indisponibles" }} onRetry={reload} />;
  }

  const set = <K extends keyof ProgramSettings>(key: K, value: ProgramSettings[K]) => {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
    setNotice(undefined);
  };

  // Seuls les champs modifiés sont envoyés
  const changes = (Object.keys(draft) as (keyof ProgramSettings)[]).filter(
    (k) => k !== "slug" && k !== "logo" && JSON.stringify(draft[k]) !== JSON.stringify(data.settings[k]),
  );
  const colorError = (["bgColor", "fgColor", "accentColor"] as const).some((k) => !HEX.test(draft[k]));
  const stamps = draft.type === "stamps";

  async function save() {
    if (!session || !draft) return;
    setSaving(true);
    setNotice(undefined);
    try {
      const patch = Object.fromEntries(changes.map((k) => [k, draft[k]])) as Partial<ProgramSettings>;
      const res = await api.updateSettings(session.token, patch);
      setData(res);
      setNotice({ tone: "ok", text: "Carte mise à jour. Les cartes de vos clients se mettent à jour automatiquement." });
      void syncNow(); // rafraîchit le cache de la caisse (couleurs, récompense…)
    } catch (e) {
      setNotice({ tone: "error", text: toRemoteError(e).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {section !== "proximite" && (
        <CardPreview
          merchantName={draft.merchantName}
          title={draft.name}
          type={draft.type}
          value={stamps ? Math.ceil(draft.stampsRequired / 2) : Math.round(draft.pointsRequired / 2)}
          goal={stamps ? draft.stampsRequired : draft.pointsRequired}
          rewardLabel={draft.rewardLabel}
          bgColor={HEX.test(draft.bgColor) ? draft.bgColor : data.settings.bgColor}
          fgColor={HEX.test(draft.fgColor) ? draft.fgColor : data.settings.fgColor}
          accentColor={HEX.test(draft.accentColor) ? draft.accentColor : data.settings.accentColor}
          footer="Aperçu de la carte dans le Wallet"
          stampIcon={draft.stampIcon}
          pattern={draft.pattern}
          logo={draft.logo}
        />
      )}

      {section === "apparence" && (
        <AppearanceSection
          draft={draft}
          set={set}
          onLogo={(logo) => {
            // Le logo est enregistré tout de suite : on l'applique au brouillon et à la référence serveur
            setDraft((d) => (d ? { ...d, logo } : d));
            setData((d) => (d ? { ...d, settings: { ...d.settings, logo } } : d));
          }}
        />
      )}
      {section === "offre" && <OfferSection draft={draft} set={set} hasCustomers={Object.keys(ledger.confirmed).length > 0} />}
      {section === "proximite" && <ProximitySection locations={draft.locations} onChange={(v) => set("locations", v)} />}

      <View style={{ gap: space.sm }}>
        {notice && <Notice tone={notice.tone} text={notice.text} />}
        <Button
          label={changes.length ? `Enregistrer (${changes.length} modification${changes.length > 1 ? "s" : ""})` : "Aucune modification"}
          icon="save-outline"
          onPress={save}
          loading={saving}
          disabled={!changes.length || colorError}
        />
        {changes.length > 0 && <Button label="Annuler les modifications" variant="secondary" onPress={() => setDraft(data.settings)} />}
      </View>
    </>
  );
}
