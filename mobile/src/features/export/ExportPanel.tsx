// Export des données du commerce (responsable) : Excel, PDF ou CSV.
// Version web : le fichier se télécharge. Téléphone : il s'ouvre dans le navigateur (lien à usage unique),
// d'où on peut l'enregistrer, l'imprimer ou l'envoyer par e-mail à son comptable.
import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Linking, Platform, Pressable, StyleSheet, View } from "react-native";
import { api, type ExportQuery } from "@/lib/api";
import { useStore } from "@/lib/store";
import { toRemoteError } from "@/lib/useRemote";
import { Notice } from "@/ui/components";
import { Text } from "@/ui/text";
import { space, usePalette } from "@/ui/theme";

type Choice = { key: string; label: string; hint: string; icon: "grid-outline" | "document-text-outline" | "list-outline"; query: ExportQuery };

const choices = (days: number): Choice[] => [
  { key: "xlsx", label: "Excel", hint: "Résumé, clients, passages", icon: "grid-outline", query: { format: "xlsx", days } },
  { key: "pdf", label: "PDF", hint: "Rapport à imprimer", icon: "document-text-outline", query: { format: "pdf", days } },
  { key: "csv", label: "CSV", hint: "Liste des clients", icon: "list-outline", query: { format: "csv", data: "clients", days } },
];

export function ExportPanel({ days = 30, compact }: { days?: number; compact?: boolean }) {
  const p = usePalette();
  const { session } = useStore();
  const [busy, setBusy] = useState<string>();
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string }>();

  async function run(c: Choice) {
    if (!session || busy) return;
    setBusy(c.key);
    setNotice(undefined);
    try {
      if (Platform.OS === "web") {
        const { blob, name } = await api.exportFile(session.token, c.query);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setNotice({ tone: "ok", text: `${c.label} téléchargé : ${name}` });
      } else {
        await Linking.openURL(await api.exportLink(session.token, c.query));
        setNotice({ tone: "ok", text: `${c.label} ouvert dans le navigateur : enregistrez-le ou partagez-le.` });
      }
    } catch (e) {
      setNotice({ tone: "error", text: toRemoteError(e).message });
    } finally {
      setBusy(undefined);
    }
  }

  return (
    <View style={{ gap: space.sm }}>
      <View style={styles.row}>
        {choices(days).map((c) => (
          <Pressable
            key={c.key}
            onPress={() => void run(c)}
            accessibilityRole="button"
            accessibilityLabel={`Exporter en ${c.label} : ${c.hint}`}
            style={({ pressed }) => [
              styles.tile,
              { backgroundColor: p.surface, borderColor: p.line, opacity: busy && busy !== c.key ? 0.5 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] },
            ]}
          >
            <View style={[styles.icon, { backgroundColor: busy === c.key ? p.accent : p.accentSoft }]}>
              <Ionicons name={busy === c.key ? "hourglass-outline" : c.icon} size={18} color={busy === c.key ? "#fff" : p.accent} />
            </View>
            <Text style={{ color: p.text, fontWeight: "600", fontSize: 15 }}>{c.label}</Text>
            {!compact && <Text style={{ color: p.muted, fontSize: 12, lineHeight: 16 }}>{c.hint}</Text>}
          </Pressable>
        ))}
      </View>
      {notice && <Notice tone={notice.tone} text={notice.text} />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: space.sm },
  tile: { flex: 1, borderWidth: 1, borderRadius: 16, padding: space.md, gap: 6 },
  icon: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
});
