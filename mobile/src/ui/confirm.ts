// Confirmation native (iOS / Android) ou du navigateur (version web).
import { Alert, Platform } from "react-native";

export function confirm(title: string, text: string, okLabel = "Confirmer", destructive = false): Promise<boolean> {
  if (Platform.OS === "web") return Promise.resolve(window.confirm(`${title}\n\n${text}`));
  return new Promise((resolve) =>
    Alert.alert(title, text, [
      { text: "Annuler", style: "cancel", onPress: () => resolve(false) },
      { text: okLabel, style: destructive ? "destructive" : "default", onPress: () => resolve(true) },
    ]),
  );
}
