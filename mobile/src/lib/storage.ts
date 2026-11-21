// Stockage sur le téléphone.
// - Le jeton de connexion va dans le trousseau sécurisé (SecureStore).
// - Le cache des cartes et la file des passages vont dans AsyncStorage.
// SecureStore n'existe pas sur le web : en développement web, on se replie sur AsyncStorage.
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const SECRET_KEY = "fidelite.session";

export async function getSecret(): Promise<string | null> {
  if (Platform.OS === "web") return AsyncStorage.getItem(SECRET_KEY);
  return SecureStore.getItemAsync(SECRET_KEY);
}

export async function setSecret(value: string | null) {
  if (Platform.OS === "web") {
    return value === null ? AsyncStorage.removeItem(SECRET_KEY) : AsyncStorage.setItem(SECRET_KEY, value);
  }
  return value === null ? SecureStore.deleteItemAsync(SECRET_KEY) : SecureStore.setItemAsync(SECRET_KEY, value);
}

export async function getJson<T>(key: string): Promise<T | undefined> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

export function setJson(key: string, value: unknown) {
  return AsyncStorage.setItem(key, JSON.stringify(value));
}

export function remove(key: string) {
  return AsyncStorage.removeItem(key);
}
