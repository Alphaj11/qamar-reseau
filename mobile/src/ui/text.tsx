// Texte de l'appli : Geist partout, Geist Mono avec `fontFamily: "mono"`.
// Avec une police chargée, chaque graisse est une famille à part : on convertit fontWeight en famille.
import { StyleSheet, Text as RNText, TextInput as RNTextInput, type TextInputProps, type TextProps, type TextStyle } from "react-native";
import { palette } from "./theme";

const SANS: Record<string, string> = {
  "100": "Geist_400Regular",
  "200": "Geist_400Regular",
  "300": "Geist_400Regular",
  "400": "Geist_400Regular",
  normal: "Geist_400Regular",
  "500": "Geist_500Medium",
  "600": "Geist_600SemiBold",
  "700": "Geist_700Bold",
  bold: "Geist_700Bold",
  "800": "Geist_700Bold",
  "900": "Geist_700Bold",
};

const MONO: Record<string, string> = {
  "400": "GeistMono_400Regular",
  normal: "GeistMono_400Regular",
  "500": "GeistMono_500Medium",
  "600": "GeistMono_600SemiBold",
  "700": "GeistMono_600SemiBold",
  bold: "GeistMono_600SemiBold",
};

export function fontStyle(style: TextStyle | undefined): TextStyle {
  const weight = String(style?.fontWeight ?? "400");
  const family = style?.fontFamily;
  if (family && family !== "mono" && family !== "sans") return {};
  const map = family === "mono" ? MONO : SANS;
  return { fontFamily: map[weight] ?? map["400"], fontWeight: "normal" };
}

export function Text({ style, ...props }: TextProps) {
  const flat = StyleSheet.flatten(style) as TextStyle | undefined;
  return <RNText {...props} style={[{ color: palette.text }, style, fontStyle(flat)]} />;
}

export function TextInput({ style, ...props }: TextInputProps) {
  const flat = StyleSheet.flatten(style) as TextStyle | undefined;
  return <RNTextInput selectionColor={palette.accent} {...props} style={[style, fontStyle(flat)]} />;
}
