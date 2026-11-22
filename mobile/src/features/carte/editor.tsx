// Sections d'édition de la carte (onglet Carte) : apparence, offre, proximité.
// L'état (brouillon) est tenu par l'écran ; ces sections ne font qu'afficher et modifier.
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useEffect, useState } from "react";
import { Image, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SvgXml } from "react-native-svg";
import { api } from "@/lib/api";
import { patternSvg, STAMP_ICON_IDS, STAMP_ICONS, TEMPLATE_GROUPS, TEMPLATES, type CardTemplate } from "@/lib/card-design";
import { useStore } from "@/lib/store";
import type { ProgramSettings, StampIcon, StoreLocation } from "@/lib/types";
import { toRemoteError } from "@/lib/useRemote";
import { Text } from "@/ui/text";
import { Button, Field, Notice, Section, Segmented, Stepper } from "@/ui/components";
import { space, type as typo, usePalette } from "@/ui/theme";

export type SetField = <K extends keyof ProgramSettings>(key: K, value: ProgramSettings[K]) => void;

export const HEX = /^#[0-9a-fA-F]{6}$/;

// Quelques jeux de couleurs prêts à l'emploi (fond, texte, accent)
const PRESETS: [string, string, string][] = [
  ["#3b2416", "#fdf6ec", "#e0a458"],
  ["#111827", "#f9fafb", "#22c55e"],
  ["#f3e8e4", "#4a2c2a", "#b5536b"],
  ["#0f2a44", "#eef6ff", "#5fb3f9"],
  ["#fefce8", "#3f3a12", "#ca8a04"],
  ["#1f1033", "#f5f0ff", "#c084fc"],
];

// ——— Apparence (le studio) ———

const tap = () => {
  if (Platform.OS !== "web") void Haptics.selectionAsync().catch(() => undefined);
};

const iconXml = (name: StampIcon) => `<svg viewBox="0 0 24 24">${STAMP_ICONS[name].svg}</svg>`;

export function AppearanceSection({
  draft,
  set,
  onLogo,
  onBanner,
}: {
  draft: ProgramSettings;
  set: SetField;
  onLogo: (logo: string | undefined) => void;
  onBanner: (banner: string | undefined) => void;
}) {
  const [applied, setApplied] = useState<string>();

  function applyTemplate(t: CardTemplate) {
    tap();
    set("template", t.id);
    set("bgColor", t.bgColor);
    set("fgColor", t.fgColor);
    set("accentColor", t.accentColor);
    set("labelColor", t.fgColor);
    set("stampIcon", t.icon);
    set("pattern", true);
    set("name", t.cardName);
    set("rewardLabel", t.rewardLabel);
    setApplied(t.label);
  }

  return (
    <>
      <Section title="Modèles par métier">
        <View style={styles.form}>
          <Hint text="Partez d'un modèle pensé pour votre métier : couleurs, pictogramme et offre. Tout reste modifiable ensuite." />
          {TEMPLATE_GROUPS.map((g) => (
            <View key={g} style={{ gap: space.sm }}>
              <GroupLabel text={g} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, paddingRight: space.md }}>
                {TEMPLATES.filter((t) => t.group === g).map((t) => (
                  <TemplateTile key={t.id} t={t} active={draft.template === t.id} onPress={() => applyTemplate(t)} />
                ))}
              </ScrollView>
            </View>
          ))}
          {applied && <Notice tone="ok" text={`Modèle « ${applied} » appliqué. Ajustez-le puis enregistrez.`} />}
        </View>
      </Section>

      <Section title="Identité">
        <View style={styles.form}>
          <LogoPicker logo={draft.logo} name={draft.merchantName} accent={draft.accentColor} bg={draft.bgColor} onLogo={onLogo} />
          <Field label="Nom du commerce" value={draft.merchantName} onChangeText={(v) => set("merchantName", v)} maxLength={40} />
          <Field label="Titre de la carte" value={draft.name} onChangeText={(v) => set("name", v)} maxLength={40} />
          <Field label="Texte de la récompense" value={draft.rewardLabel} onChangeText={(v) => set("rewardLabel", v)} maxLength={60} placeholder="Ex. : 1 baguette offerte" />
        </View>
      </Section>

      <Section title="Photo de la bannière">
        <View style={styles.form}>
          <BannerPicker banner={draft.banner} onBanner={onBanner} />
        </View>
      </Section>

      <Section title="Couleurs">
        <View style={styles.form}>
          <View style={styles.presets}>
            {PRESETS.map(([bg, fg, accent]) => {
              const on = draft.bgColor.toLowerCase() === bg && draft.accentColor.toLowerCase() === accent;
              return (
                <Pressable
                  key={bg}
                  accessibilityRole="button"
                  accessibilityLabel={`Jeu de couleurs ${bg}`}
                  accessibilityState={{ selected: on }}
                  onPress={() => {
                    tap();
                    set("bgColor", bg);
                    set("fgColor", fg);
                    set("labelColor", fg);
                    set("accentColor", accent);
                  }}
                  style={({ pressed }) => [styles.preset, { backgroundColor: bg, transform: [{ scale: pressed ? 0.92 : 1 }] }, on && styles.presetOn]}
                >
                  <View style={[styles.presetDot, { backgroundColor: accent }]} />
                </Pressable>
              );
            })}
          </View>
          <Hint text="Touchez une pastille ou saisissez un code couleur (#RRGGBB)." />
          <ColorField label="Fond de la carte" value={draft.bgColor} onChange={(v) => set("bgColor", v)} />
          <ColorField label="Texte" value={draft.fgColor} onChange={(v) => set("fgColor", v)} />
          <ColorField label="Petits titres (Récompense, Membre…)" value={draft.labelColor ?? draft.fgColor} onChange={(v) => set("labelColor", v)} />
          <ColorField label="Accent (tampons, barre)" value={draft.accentColor} onChange={(v) => set("accentColor", v)} />
        </View>
      </Section>

      <Section title="Pictogramme">
        <View style={styles.form}>
          <IconGrid
            value={draft.stampIcon}
            onChange={(v) => {
              tap();
              set("stampIcon", v);
            }}
          />
          <Segmented
            options={[
              { value: "on", label: "Motif en filigrane" },
              { value: "off", label: "Fond uni" },
            ]}
            value={draft.pattern ? "on" : "off"}
            onChange={(v) => {
              tap();
              set("pattern", v === "on");
            }}
          />
          <Hint text="Le pictogramme remplit les tampons et peut décorer le fond de la carte, très discrètement." />
        </View>
      </Section>
    </>
  );
}

function GroupLabel({ text }: { text: string }) {
  const p = usePalette();
  return <Text style={[typo.label, { color: p.muted }]}>{text}</Text>;
}

/** Mini carte aux couleurs du modèle. */
function TemplateTile({ t, active, onPress }: { t: CardTemplate; active: boolean; onPress: () => void }) {
  const p = usePalette();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Modèle ${t.label}`}
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [{ gap: 6, width: 112, transform: [{ scale: pressed ? 0.96 : 1 }] }]}
    >
      <View style={[styles.tile, { backgroundColor: t.bgColor, borderColor: active ? p.accent : "transparent" }]}>
        <SvgXml
          xml={`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 224 140" preserveAspectRatio="xMidYMid slice">${patternSvg(t.icon, 224, 140, t.fgColor, 0.1)}</svg>`}
          width="100%"
          height="100%"
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.tileBadge, { backgroundColor: t.accentColor }]}>
          <SvgXml xml={iconXml(t.icon)} width={18} height={18} color={t.bgColor} />
        </View>
        <View style={{ flexDirection: "row", gap: 3 }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} style={[styles.tileDot, { backgroundColor: i < 3 ? t.accentColor : "transparent", borderColor: t.accentColor }]} />
          ))}
        </View>
        {active && (
          <View style={[styles.tileCheck, { backgroundColor: p.accent }]}>
            <Ionicons name="checkmark" size={12} color="#fff" />
          </View>
        )}
      </View>
      <Text style={{ color: p.text, fontSize: 13, fontWeight: active ? "600" : "500" }} numberOfLines={1}>
        {t.label}
      </Text>
    </Pressable>
  );
}

function IconGrid({ value, onChange }: { value: StampIcon; onChange: (v: StampIcon) => void }) {
  const p = usePalette();
  return (
    <View style={styles.icons}>
      {STAMP_ICON_IDS.map((id) => {
        const on = id === value;
        return (
          <Pressable
            key={id}
            onPress={() => onChange(id)}
            accessibilityRole="button"
            accessibilityLabel={STAMP_ICONS[id].label}
            accessibilityState={{ selected: on }}
            style={({ pressed }) => [
              styles.icon,
              { backgroundColor: on ? p.accent : p.surface2, borderColor: on ? p.accent : p.line, transform: [{ scale: pressed ? 0.9 : 1 }] },
            ]}
          >
            <SvgXml xml={iconXml(id)} width={22} height={22} color={on ? "#fff" : p.text} />
          </Pressable>
        );
      })}
    </View>
  );
}

/** Logo : choisi dans la photothèque, recadré en carré, envoyé tout de suite (le serveur le réduit en 256 × 256). */
function LogoPicker({ logo, name, accent, bg, onLogo }: { logo?: string; name: string; accent: string; bg: string; onLogo: (logo: string | undefined) => void }) {
  const p = usePalette();
  const { session } = useStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function pick() {
    if (!session) return;
    setError(undefined);
    if (Platform.OS !== "web") {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return setError("Accès aux photos refusé. Autorisez-le dans les réglages du téléphone.");
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.7, base64: true });
    const asset = res.canceled ? undefined : res.assets[0];
    if (!asset) return;
    const image = asset.base64 ?? (asset.uri.startsWith("data:") ? asset.uri : undefined);
    if (!image) return setError("Image illisible, essayez-en une autre.");
    setBusy(true);
    try {
      const out = await api.uploadLogo(session.token, image);
      onLogo(out.settings.logo);
    } catch (e) {
      setError(toRemoteError(e).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!session) return;
    setBusy(true);
    setError(undefined);
    try {
      await api.deleteLogo(session.token);
      onLogo(undefined);
    } catch (e) {
      setError(toRemoteError(e).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ gap: space.sm }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
        {logo ? (
          <Image source={{ uri: logo }} style={[styles.logo, { borderColor: p.line }]} accessibilityLabel="Logo actuel" />
        ) : (
          <View style={[styles.logo, { backgroundColor: accent, borderColor: p.line, alignItems: "center", justifyContent: "center" }]}>
            <Text style={{ color: bg, fontSize: 24, fontWeight: "700" }}>{name.charAt(0).toUpperCase() || "Q"}</Text>
          </View>
        )}
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: p.text, fontWeight: "600", fontSize: 15 }}>Logo</Text>
          <Hint text={logo ? "Affiché sur la carte et dans le Wallet." : "Sans logo, l'initiale du commerce est affichée."} />
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: space.sm }}>
        <View style={{ flex: 1 }}>
          <Button label={logo ? "Changer" : "Ajouter un logo"} icon="image-outline" variant="secondary" onPress={() => void pick()} loading={busy} />
        </View>
        {logo ? (
          <View style={{ flex: 1 }}>
            <Button label="Retirer" variant="secondary" onPress={() => void remove()} disabled={busy} />
          </View>
        ) : null}
      </View>
      {error ? <Notice tone="error" text={error} /> : null}
    </View>
  );
}

/** Photo de bannière : une vitrine, un produit phare… posée sous les tampons, avec un voile pour rester lisible. */
function BannerPicker({ banner, onBanner }: { banner?: string; onBanner: (banner: string | undefined) => void }) {
  const p = usePalette();
  const { session } = useStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function pick() {
    if (!session) return;
    setError(undefined);
    if (Platform.OS !== "web") {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return setError("Accès aux photos refusé. Autorisez-le dans les réglages du téléphone.");
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [25, 10], quality: 0.7, base64: true });
    const asset = res.canceled ? undefined : res.assets[0];
    if (!asset) return;
    const image = asset.base64 ?? (asset.uri.startsWith("data:") ? asset.uri : undefined);
    if (!image) return setError("Image illisible, essayez-en une autre.");
    setBusy(true);
    try {
      const out = await api.uploadBanner(session.token, image);
      onBanner(out.settings.banner);
    } catch (e) {
      setError(toRemoteError(e).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!session) return;
    setBusy(true);
    setError(undefined);
    try {
      await api.deleteBanner(session.token);
      onBanner(undefined);
    } catch (e) {
      setError(toRemoteError(e).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ gap: space.sm }}>
      {banner ? (
        <Image source={{ uri: banner }} style={[styles.banner, { borderColor: p.line }]} accessibilityLabel="Photo de bannière actuelle" />
      ) : (
        <View style={[styles.banner, { borderColor: p.line, backgroundColor: p.surface2, alignItems: "center", justifyContent: "center", gap: 4 }]}>
          <Ionicons name="image-outline" size={26} color={p.muted} />
          <Text style={{ color: p.muted, fontSize: 13 }}>Aucune photo : fond uni ou motif</Text>
        </View>
      )}
      <Hint text="Votre vitrine, votre produit phare, votre ambiance… Elle s'affiche derrière les tampons, sur la carte et dans le Wallet." />
      <View style={{ flexDirection: "row", gap: space.sm }}>
        <View style={{ flex: 1 }}>
          <Button label={banner ? "Changer la photo" : "Ajouter une photo"} icon="camera-outline" variant="secondary" onPress={() => void pick()} loading={busy} />
        </View>
        {banner ? (
          <View style={{ flex: 1 }}>
            <Button label="Retirer" variant="secondary" onPress={() => void remove()} disabled={busy} />
          </View>
        ) : null}
      </View>
      {error ? <Notice tone="error" text={error} /> : null}
    </View>
  );
}

// ——— Offre ———

export function OfferSection({ draft, set, hasCustomers }: { draft: ProgramSettings; set: SetField; hasCustomers: boolean }) {
  const stamps = draft.type === "stamps";
  return (
    <>
      <Section title="Mécanique">
        <View style={styles.form}>
          <Segmented
            options={[
              { value: "stamps", label: "Tampons" },
              { value: "points", label: "Points" },
            ]}
            value={draft.type}
            onChange={(v) => set("type", v)}
            disabled={hasCustomers}
          />
          {hasCustomers && <Hint text="Le type ne peut plus changer : des clients ont déjà une carte." />}
          {stamps ? (
            <View style={{ gap: 6 }}>
              <Label text="Tampons pour une récompense" />
              <Stepper value={draft.stampsRequired} onChange={(v) => set("stampsRequired", v)} min={3} max={20} label="Tampons requis" />
            </View>
          ) : (
            <>
              <NumberField label="Points pour une récompense" value={draft.pointsRequired} onChange={(v) => set("pointsRequired", v)} />
              <NumberField label="Points par euro dépensé" value={draft.pointsPerEuro} onChange={(v) => set("pointsPerEuro", v)} decimal />
            </>
          )}
        </View>
      </Section>
      <Section title="Récompense">
        <View style={styles.form}>
          <Field label="Ce que le client gagne" value={draft.rewardLabel} onChangeText={(v) => set("rewardLabel", v)} maxLength={60} placeholder="Ex. : 1 café offert" />
          <View style={{ gap: 6 }}>
            <Label text="Idées de récompense" />
            <View style={styles.suggestions}>
              {REWARD_IDEAS.map((idea) => (
                <Suggestion key={idea} text={idea} active={draft.rewardLabel === idea} onPress={() => set("rewardLabel", idea)} />
              ))}
            </View>
          </View>
          <NumberField
            label={`Cadeau de bienvenue (${stamps ? "tampons" : "points"} offerts à l'inscription)`}
            value={draft.welcomeBonus}
            onChange={(v) => set("welcomeBonus", v)}
          />
          <Hint text="Un petit cadeau de bienvenue (1 tampon) aide le client à se sentir déjà engagé." />
        </View>
      </Section>
      <Section title="Conditions">
        <View style={styles.form}>
          <Field label="Conditions du programme (au dos de la carte)" value={draft.terms ?? ""} onChangeText={(v) => set("terms", v)} multiline maxLength={500} />
        </View>
      </Section>
    </>
  );
}

const REWARD_IDEAS = ["1 produit offert", "-10 % sur le prochain achat", "5 € de réduction", "1 boisson offerte", "1 dessert offert", "1 soin offert"];

function Suggestion({ text, active, onPress }: { text: string; active: boolean; onPress: () => void }) {
  const p = usePalette();
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        styles.suggestion,
        { backgroundColor: active ? p.inverse : p.surface2, borderColor: active ? p.inverse : p.line, transform: [{ scale: pressed ? 0.96 : 1 }] },
      ]}
    >
      <Text style={{ color: active ? p.onInverse : p.text, fontSize: 13 }}>{text}</Text>
    </Pressable>
  );
}

// ——— Proximité ———

export function ProximitySection({ locations, onChange }: { locations: StoreLocation[]; onChange: (v: StoreLocation[]) => void }) {
  const p = usePalette();
  const [locating, setLocating] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error" | "info"; text: string }>();
  const update = (i: number, patch: Partial<StoreLocation>) => onChange(locations.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  async function addHere() {
    setLocating(true);
    setNotice(undefined);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        setNotice({ tone: "error", text: "Position refusée. Autorisez-la dans les réglages du téléphone, ou saisissez l'adresse." });
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      onChange([...locations, { latitude: round(pos.coords.latitude), longitude: round(pos.coords.longitude), relevantText: "" }]);
      setNotice({ tone: "ok", text: "Boutique ajoutée à votre position. Pensez à enregistrer." });
    } catch {
      setNotice({ tone: "error", text: "Impossible d'obtenir la position. Réessayez à l'extérieur ou saisissez l'adresse." });
    } finally {
      setLocating(false);
    }
  }

  return (
    <>
      <Section title="Comment ça marche">
        <View style={styles.form}>
          <Text style={{ color: p.text, fontSize: 14, lineHeight: 20 }}>
            Quand un client qui a votre carte passe près d&apos;une de vos boutiques, son téléphone peut afficher la carte :
          </Text>
          <Bullet text="iPhone : la carte apparaît sur l'écran verrouillé avec votre texte. Rayon court (de l'ordre d'une centaine de mètres), fixé par Apple." />
          <Bullet text="Android : Google Wallet envoie une notification. Google choisit le rayon, le délai et le texte." />
          <Hint text="Ce n'est pas garanti à chaque passage : le téléphone décide selon ses réglages (localisation, mode économie, suggestions Wallet). Ne promettez pas une alerte systématique à vos clients." />
        </View>
      </Section>

      <Section title={`Boutiques · ${locations.length}/10`}>
        <View style={styles.form}>
          {locations.length === 0 && <Hint text="Aucune adresse pour le moment. Depuis la boutique, un geste suffit ; sinon, saisissez l'adresse." />}
          {locations.map((l, i) => (
            <View key={i} style={[styles.location, { borderColor: p.line }]}>
              <Text style={{ color: p.text, fontWeight: "600" }}>Boutique {i + 1}</Text>
              <Field
                label="Texte sur l'écran verrouillé (iPhone)"
                value={l.relevantText ?? ""}
                onChangeText={(v) => update(i, { relevantText: v })}
                maxLength={80}
                placeholder="Ex. : Votre café offert vous attend juste à côté"
              />
              <View style={{ flexDirection: "row", gap: space.sm }}>
                <View style={{ flex: 1 }}>
                  <NumberField label="Latitude" value={l.latitude} onChange={(v) => update(i, { latitude: v })} decimal signed />
                </View>
                <View style={{ flex: 1 }}>
                  <NumberField label="Longitude" value={l.longitude} onChange={(v) => update(i, { longitude: v })} decimal signed />
                </View>
              </View>
              <Button label="Retirer cette boutique" variant="danger" onPress={() => onChange(locations.filter((_, j) => j !== i))} />
            </View>
          ))}
          {notice && <Notice tone={notice.tone} text={notice.text} />}
          {locations.length < 10 && (
            <>
              <Button label="Ajouter ma position actuelle" icon="locate-outline" onPress={() => void addHere()} loading={locating} />
              <AddressSearch onFound={(lat, lng) => onChange([...locations, { latitude: lat, longitude: lng, relevantText: "" }])} />
            </>
          )}
        </View>
      </Section>
    </>
  );
}

/** Recherche par adresse (géocodage du téléphone ; non disponible sur la version web). */
function AddressSearch({ onFound }: { onFound: (lat: number, lng: number) => void }) {
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  if (Platform.OS === "web") return null;

  async function search() {
    setBusy(true);
    setError(undefined);
    try {
      const [hit] = await Location.geocodeAsync(address);
      if (!hit) return setError("Adresse introuvable");
      onFound(round(hit.latitude), round(hit.longitude));
      setAddress("");
    } catch {
      setError("Recherche impossible pour le moment");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ gap: space.sm }}>
      <Field label="Ou par adresse" value={address} onChangeText={setAddress} placeholder="12 rue de la Paix, 75002 Paris" error={error} />
      <Button label="Ajouter cette adresse" variant="secondary" icon="search-outline" onPress={() => void search()} loading={busy} disabled={address.trim().length < 5} />
    </View>
  );
}

const round = (n: number) => Math.round(n * 1e6) / 1e6;

// ——— Petits éléments ———

export function Label({ text }: { text: string }) {
  const p = usePalette();
  return <Text style={{ color: p.text, fontWeight: "600", fontSize: 14 }}>{text}</Text>;
}

export function Hint({ text }: { text: string }) {
  const p = usePalette();
  return <Text style={{ color: p.muted, fontSize: 13, lineHeight: 18 }}>{text}</Text>;
}

function Bullet({ text }: { text: string }) {
  const p = usePalette();
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      <Text style={{ color: p.muted }}>•</Text>
      <Text style={{ color: p.text, fontSize: 14, lineHeight: 20, flex: 1 }}>{text}</Text>
    </View>
  );
}

/** Champ numérique : garde la saisie en texte pour permettre "1," ou "-" en cours de frappe. */
export function NumberField({
  label,
  value,
  onChange,
  decimal,
  signed,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  decimal?: boolean;
  signed?: boolean;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => {
    const t = setTimeout(() => setText((cur) => (Number.parseFloat(cur.replace(",", ".")) === value ? cur : String(value))), 0);
    return () => clearTimeout(t);
  }, [value]);
  return (
    <Field
      label={label}
      value={text}
      keyboardType={decimal ? (signed ? "numbers-and-punctuation" : "decimal-pad") : "number-pad"}
      onChangeText={(t) => {
        const clean = t.replace(signed ? /[^\d.,-]/g : decimal ? /[^\d.,]/g : /\D/g, "");
        setText(clean);
        const n = decimal ? Number.parseFloat(clean.replace(",", ".")) : Number.parseInt(clean, 10);
        if (Number.isFinite(n)) onChange(n);
      }}
    />
  );
}

/** Nuancier commun aux champs de couleur : couvre la plupart des chartes de commerce. */
const SWATCHES = [
  "#ffffff", "#f5f0e6", "#fdf6ec", "#e5e7eb", "#9ca3af", "#4b5563", "#111827", "#000000",
  "#3b2416", "#7c4a2d", "#e0a458", "#ca8a04", "#fde68a", "#fef3c7",
  "#7f1d1d", "#dc2626", "#fb7185", "#f3e8e4", "#b5536b", "#FC4F00",
  "#14532d", "#16a34a", "#84cc16", "#0f766e", "#5eead4",
  "#0f2a44", "#1d4ed8", "#5fb3f9", "#1f1033", "#7c3aed", "#c084fc",
];

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const p = usePalette();
  const valid = HEX.test(value);
  return (
    <View style={{ gap: space.sm }}>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: space.sm }}>
        <View style={{ flex: 1 }}>
          <Field
            label={label}
            value={value}
            onChangeText={(t) => onChange(t.startsWith("#") ? t.slice(0, 7) : `#${t.slice(0, 6)}`)}
            autoCapitalize="none"
            autoCorrect={false}
            error={valid ? undefined : "Format #RRGGBB"}
          />
        </View>
        <View style={[styles.swatch, { backgroundColor: valid ? value : "transparent", borderColor: p.line, marginBottom: valid ? 0 : 22 }]} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingRight: space.md }}>
        {SWATCHES.map((c) => {
          const on = valid && value.toLowerCase() === c.toLowerCase();
          return (
            <Pressable
              key={c}
              onPress={() => {
                tap();
                onChange(c);
              }}
              accessibilityRole="button"
              accessibilityLabel={`${label} : ${c}`}
              accessibilityState={{ selected: on }}
              style={({ pressed }) => [
                styles.chip,
                { backgroundColor: c, borderColor: on ? p.accent : p.line, borderWidth: on ? 3 : 1, transform: [{ scale: pressed ? 0.9 : 1 }] },
              ]}
            />
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { padding: space.md, gap: space.md },
  presets: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  preset: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  presetOn: { borderWidth: 3, borderColor: "#FC4F00" },
  tile: { height: 70, borderRadius: 14, borderWidth: 2, padding: 8, justifyContent: "space-between", overflow: "hidden" },
  tileBadge: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  tileDot: { width: 9, height: 9, borderRadius: 3, borderWidth: 1.5 },
  tileCheck: { position: "absolute", top: 6, right: 6, width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  icons: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  icon: { width: 46, height: 46, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  logo: { width: 64, height: 64, borderRadius: 32, borderWidth: 1, overflow: "hidden" },
  presetDot: { width: 16, height: 16, borderRadius: 8 },
  swatch: { width: 50, height: 50, borderRadius: 12, borderWidth: 1 },
  chip: { width: 30, height: 30, borderRadius: 15 },
  banner: { width: "100%", aspectRatio: 1125 / 432, borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  suggestions: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  suggestion: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  location: { borderWidth: 1, borderRadius: 12, padding: space.md, gap: space.md },
});
