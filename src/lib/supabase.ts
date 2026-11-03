import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import "react-native-url-polyfill/auto";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  console.warn("Supabase environment variables are missing. Add them to your local .env file.");
}

// SecureStore is used on native devices; AsyncStorage is used on web.
// Session storage contains user auth tokens only. Never put service-role keys here.
// Store long sessions in small encrypted chunks to stay below platform-specific
// SecureStore item-size limits (notably older iOS Keychain implementations).
const CHUNK_SIZE = 1800;
const nativeStorage = {
  async getItem(key: string) {
    const manifest = await SecureStore.getItemAsync(key);
    if (manifest === null) return null;
    const count = Number(manifest);
    if (!Number.isInteger(count) || count < 0 || count > 100) {
      await this.removeItem(key);
      return null;
    }
    const chunks = await Promise.all(
      Array.from({ length: count }, (_, index) =>
        SecureStore.getItemAsync(`${key}.${index}`)
      )
    );
    if (chunks.some((chunk) => chunk === null)) {
      await this.removeItem(key);
      return null;
    }
    return chunks.join("");
  },
  async setItem(key: string, value: string) {
    const previous = Number(await SecureStore.getItemAsync(key) ?? "0");
    const chunks = Math.ceil(value.length / CHUNK_SIZE);
    for (let index = 0; index < chunks; index += 1) {
      await SecureStore.setItemAsync(
        `${key}.${index}`,
        value.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE)
      );
    }
    await SecureStore.setItemAsync(key, String(chunks));
    for (let index = chunks; index < previous; index += 1) {
      await SecureStore.deleteItemAsync(`${key}.${index}`);
    }
  },
  async removeItem(key: string) {
    const count = Number(await SecureStore.getItemAsync(key) ?? "0");
    await SecureStore.deleteItemAsync(key);
    if (Number.isInteger(count) && count > 0 && count <= 100) {
      await Promise.all(
        Array.from({ length: count }, (_, index) =>
          SecureStore.deleteItemAsync(`${key}.${index}`)
        )
      );
    }
  },
};

const webStorage = {
  getItem: (key: string) => AsyncStorage.getItem(key),
  setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
  removeItem: (key: string) => AsyncStorage.removeItem(key),
};

export const supabase = createClient(
  supabaseUrl ?? "",
  supabasePublishableKey ?? "",
  {
    auth: {
      storage: Platform.OS === "web" ? webStorage : nativeStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
