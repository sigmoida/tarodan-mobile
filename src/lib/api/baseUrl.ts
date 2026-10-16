import { Platform } from "react-native";
import Constants from "expo-constants";
import { deepLinkConfig, productionHosts } from "@/lib/deeplinks";
import { parseStrictUrl } from "@/lib/security/url";
import { logger } from "@/services/logger";

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
 * Mağaza / staging build'i (`EXPO_PUBLIC_ENVIRONMENT` AÇIKÇA production, preview ya da
 * staging) ASLA düz HTTP'ye ya da LAN/emülatör adresine düşmez: env adresi katı `https://`
 * değilse (eksik, `http://`, bozuk, `user@`'li) yapılandırma hatasıdır — hata günlüğe (Sentry)
 * yazılır ve ORTAMIN KENDİ https API'si kullanılır (production → `https://tarodan.com.tr/api`,
 * preview/staging → staging). Oturum belirteci, ödeme ve kimlik verisi bu build'lerde hiçbir
 * koşulda şifresiz kanaldan gitmez. Yayın hattı aynı kuralı yayından önce de uygular
 * (`scripts/ci/release.sh` → `require_public_env`).
 *
 * Ortamı BELİRSİZ build (yerel release, Maestro) production'a SESSİZCE yönlendirilmez:
 * yapılandırılan adres olduğu gibi kullanılır (release bundle'ında https değilse uyarı yazılır).
 */

export type ApiUrlInputs = {
  /** `EXPO_PUBLIC_ENVIRONMENT`: development | preview | staging | production | undefined. */
  environment: string | undefined;
  /** `EXPO_PUBLIC_API_URL`. */
  envUrl: string | undefined;
  /** `__DEV__`. */
  isDev: boolean;
  /** Expo Go / dev client LAN host'u (yalnız geliştirmede kullanılır). */
  expoHost?: string;
  platform?: string;
};

/** Bu build'de API adresi https olmak ZORUNDA mı: yalnız AÇIKÇA mağaza / staging ortamı. */
export function isReleaseEnvironment(environment: string | undefined): boolean {
  return environment === "production" || environment === "preview" || environment === "staging";
}

/** Release yapılandırması bozuksa kullanılacak, ortamın kendi https API adresi. */
export function releaseFallbackApiUrl(environment: string | undefined): string {
  const host =
    environment === "production" ? productionHosts()[0] : deepLinkConfig.stagingHosts[0];
  return `https://${host}/api`;
}

/** Saf çözümleyici (test edilebilir); uygulama `resolveApiBaseUrl()`'i kullanır. */
export function resolveApiBaseUrlFrom(inputs: ApiUrlInputs): string {
  const envUrl = (inputs.envUrl ?? "").trim().replace(/\/+$/, "");

  if (isReleaseEnvironment(inputs.environment)) {
    if (parseStrictUrl(envUrl)) return envUrl;
    const fallback = releaseFallbackApiUrl(inputs.environment);
    logger.error("EXPO_PUBLIC_API_URL release build'inde https olmalı; düz HTTP'ye düşülmez", {
      configured: envUrl || "(boş)",
      fallback,
    });
    return fallback;
  }

  // Ortamı belirsiz release bundle'ı (yerel release, Maestro): adres olduğu gibi, ama görünür.
  if (!inputs.isDev && inputs.environment !== "development" && !parseStrictUrl(envUrl)) {
    logger.warn("EXPO_PUBLIC_ENVIRONMENT yok ve API adresi https değil — yapılandırılan adres kullanılıyor", {
      configured: envUrl || "(boş)",
    });
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
