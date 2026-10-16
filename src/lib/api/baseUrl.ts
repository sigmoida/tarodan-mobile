import { Platform } from "react-native";
import Constants from "expo-constants";
import { deepLinkConfig, productionHosts } from "@/lib/deeplinks";

/**
 * API base URL çözümleme — TEK kaynak. `client.ts` (axios instance'ları) ve
 * axios'u yüklemeden API kökünü bilmesi gereken hafif modüller (ör. mesaj eki
 * URL doğrulaması, `./messageAttachment`) buradan okur.
 *
 * Sıra:
 * 1) EXPO_PUBLIC_API_URL (production / preview / staging build'leri için zorunlu)
 * 2) Expo Go LAN host (lokal geliştirme)
 * 3) Platform fallback'i (emülatör)
 *
 * RELEASE build'i (production / preview ortamı ya da ortamı belirsiz release
 * bundle'ı) ASLA düz HTTP'ye ya da LAN/emülatör adresine düşmez: env adresi
 * `https://` değilse (eksik, `http://`, bozuk) yapılandırma hatasıdır — konsola
 * yüksek sesle yazılır ve ORTAMIN KENDİ https API'si kullanılır (production →
 * `https://tarodan.com.tr/api`, preview → staging). Oturum belirteci, ödeme ve
 * kimlik verisi hiçbir koşulda şifresiz kanaldan gitmez. Yayın hattı aynı kuralı
 * yayından önce de uygular (`scripts/ci/release.sh` → `require_public_env`).
 */

export type ApiUrlInputs = {
  /** `EXPO_PUBLIC_ENVIRONMENT`: development | preview | production | undefined. */
  environment: string | undefined;
  /** `EXPO_PUBLIC_API_URL`. */
  envUrl: string | undefined;
  /** `__DEV__`. */
  isDev: boolean;
  /** Expo Go / dev client LAN host'u (yalnız geliştirmede kullanılır). */
  expoHost?: string;
  platform?: string;
};

/** Bu build'de API adresi https olmak ZORUNDA mı (mağaza / staging / release bundle'ı). */
export function isReleaseEnvironment(environment: string | undefined, isDev: boolean): boolean {
  if (environment === "production" || environment === "preview") return true;
  if (environment === "development") return false;
  return !isDev;
}

/** Kullanıcı bilgisi (`user@`) taşımayan, host'u olan mutlak https adresi mi. */
const HTTPS_URL = /^https:\/\/[^/?#\s@\\]+(?:[/?#][^\s]*)?$/i;

/** Release yapılandırması bozuksa kullanılacak, ortamın kendi https API adresi. */
export function releaseFallbackApiUrl(environment: string | undefined): string {
  const host =
    environment === "preview" ? deepLinkConfig.stagingHosts[0] : productionHosts()[0];
  return `https://${host}/api`;
}

/** Saf çözümleyici (test edilebilir); uygulama `resolveApiBaseUrl()`'i kullanır. */
export function resolveApiBaseUrlFrom(inputs: ApiUrlInputs): string {
  const envUrl = (inputs.envUrl ?? "").trim().replace(/\/+$/, "");

  if (isReleaseEnvironment(inputs.environment, inputs.isDev)) {
    if (HTTPS_URL.test(envUrl)) return envUrl;
    const fallback = releaseFallbackApiUrl(inputs.environment);
    console.error(
      `[api] EXPO_PUBLIC_API_URL release build'inde https olmalı ('${envUrl || "(boş)"}'); ` +
        `düz HTTP'ye düşülmez — ${fallback} kullanılıyor.`,
    );
    return fallback;
  }

  if (envUrl.length > 0) return envUrl;

  if (inputs.expoHost) return `http://${inputs.expoHost}:3001/api`;

  if (inputs.platform === "android") return "http://10.0.2.2:3001/api";

  return "http://localhost:3001/api";
}

export function resolveApiBaseUrl(): string {
  return resolveApiBaseUrlFrom({
    // `process.env.EXPO_PUBLIC_*` erişimleri DOĞRUDAN kalmalı (derlemede literal'e çevrilir).
    environment: process.env.EXPO_PUBLIC_ENVIRONMENT,
    envUrl: process.env.EXPO_PUBLIC_API_URL,
    isDev: __DEV__,
    expoHost: Constants.expoConfig?.hostUri?.split(":")[0],
    platform: Platform.OS,
  });
}
