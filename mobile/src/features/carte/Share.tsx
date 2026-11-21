// QR code d'inscription : ce que le client scanne en caisse pour ajouter la carte à son Wallet.
import { useState } from "react";
import { Image, Linking, Share, View } from "react-native";
import { Text } from "@/ui/text";
import type { Account } from "@/lib/types";
import { Button, Notice, Section } from "@/ui/components";
import { radius, space, usePalette } from "@/ui/theme";

export function ShareSection({ account, merchantName }: { account: Account; merchantName: string }) {
  const p = usePalette();
  const [notice, setNotice] = useState<string>();
  const { enrollUrl, qrUrl, posterUrl } = account;
  if (!enrollUrl || !qrUrl || !posterUrl) return <Notice tone="error" text="Lien d'inscription indisponible." />;

  async function share() {
    try {
      await Share.share({ message: `Rejoignez la carte de fidélité ${merchantName} : ${enrollUrl}` });
    } catch {
      setNotice(`Copiez ce lien : ${enrollUrl}`);
    }
  }

  return (
    <>
      <Section title="QR code d'inscription">
        <View style={{ padding: space.lg, gap: space.md, alignItems: "center" }}>
          <Image
            source={{ uri: qrUrl }}
            style={{ width: 220, height: 220, borderRadius: radius.md, backgroundColor: "#fff" }}
            accessibilityLabel="QR code d'inscription à la carte de fidélité"
          />
          <Text style={{ color: p.text, fontSize: 15, textAlign: "center", lineHeight: 21 }}>
            Le client le scanne avec l&apos;appareil photo, donne son prénom, et la carte s&apos;ajoute à son Wallet. Aucune
            application à installer.
          </Text>
          <Text selectable style={{ color: p.muted, fontSize: 13 }}>
            {enrollUrl}
          </Text>
        </View>
      </Section>
      {notice && <Notice tone="info" text={notice} />}
      <Button label="Imprimer l'affiche (A5 / A4)" icon="print-outline" onPress={() => void Linking.openURL(posterUrl)} />
      <Button label="Partager le lien" variant="secondary" icon="share-outline" onPress={() => void share()} />
      <Button label="Voir la page client" variant="secondary" icon="open-outline" onPress={() => void Linking.openURL(enrollUrl)} />
      <Section title="Où le mettre">
        <View style={{ padding: space.md, gap: space.sm }}>
          <Text style={{ color: p.text, lineHeight: 20 }}>• Sur le comptoir, à côté du terminal de paiement : c&apos;est là que le client attend.</Text>
          <Text style={{ color: p.text, lineHeight: 20 }}>• En vitrine, pour les passants.</Text>
          <Text style={{ color: p.text, lineHeight: 20 }}>
            • Dites-le à voix haute : « Vous voulez votre carte de fidélité ? Scannez ici. » Une affiche seule convertit peu.
          </Text>
        </View>
      </Section>
    </>
  );
}
