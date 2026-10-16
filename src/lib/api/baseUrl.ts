import { Platform } from "react-native";
import Constants from "expo-constants";

/**
 * API base URL çözümleme — TEK kaynak. `client.ts` (axios instance'ları) ve
 * axios'u yüklemeden API kökünü bilmesi gereken hafif modüller (ör. mesaj eki
 * URL doğrulaması, `./messageAttachment`) buradan okur.
 *
 * Sıra:
 * 1) EXPO_PUBLIC_API_URL (production / preview / staging build'leri için zorunlu)
 * 2) Expo Go LAN host (lokal geliştirme)
 * 3) Platform fallback'i (emülatör)
 */
export function resolveApiBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && envUrl.length > 0) {
    return envUrl.replace(/\/$/, "");
  }

  const expoHost = Constants.expoConfig?.hostUri?.split(":")[0];
  if (expoHost) {
    return `http://${expoHost}:3001/api`;
  }

  if (Platform.OS === "android") {
    return "http://10.0.2.2:3001/api";
  }

  return "http://localhost:3001/api";
}
