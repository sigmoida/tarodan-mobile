import { logger, safeError } from '@/services/logger';
import { axios, createApiClient, singleFlight } from "@/lib/api-client";
import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { captureException } from "@/services/sentry";
import { errorFingerprint } from "./requestId";
import { authFailureKind } from "./authFailureKind";
import { refreshFailureKind } from "./refreshFailure";
import { acceptLanguageHeader } from "./acceptLanguage";
import { neutralizeUpsellError } from "./iosNeutralErrors";
import { noteNetworkFailure } from "@/lib/network/networkFailure";
import { isInvalidTwoFactorCode, isTwoFactorCodeRequest } from "./twoFactorCodeError";

// API URL çözümleme sırası:
// 1) EXPO_PUBLIC_API_URL (production / preview / staging build'leri için zorunlu)
// 2) Expo Go LAN host (lokal geliştirme)
// 3) Platform fallback'i (emülatör)
const getApiUrl = () => {
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
};

const API_URL = getApiUrl();

/** Çözümlenmiş API base URL'i (örn. http://host:3001/api). socket.ts gibi
 *  modüller buradan okur; URL çözümleme davranışını değiştirmez. */
export function getApiBaseUrl(): string {
  return API_URL;
}

/**
 * Stabil avatar URL'i. Backend `GET /users/:id/avatar` taze bir presigned URL'e
 * 302 redirect eder; URL hep aynı kaldığı için 24s'lik presigned expiry'sinden
 * etkilenmez (persist edilmiş/uzun cache'lenmiş veride bayatlamaz).
 *
 * `versionHint` (mevcut presigned avatar URL'i) verilirse, S3 obje yolundan
 * türetilen bir `?v` eki eklenir: foto değişince <Image> cache'i busts, aynı
 * dosyada cache hit kalır.
 */
export const buildAvatarUrl = (
  userId: string,
  versionHint?: string | null,
): string => {
  const base = `${API_URL}/users/${userId}/avatar`;
  if (!versionHint) return base;
  const filename = versionHint.split("?")[0].split("/").pop() || "";
  return filename ? `${base}?v=${encodeURIComponent(filename)}` : base;
};

// Yapılandırma ipuçları yalnız geliştirmede; release cihaz günlüğüne API adresi
// ve geliştirme host'u yazılmaz.
logger.debug("Yapılandırma", {
  apiUrl: API_URL,
  platform: Platform.OS,
  expoHost: Constants.expoConfig?.hostUri,
});

/**
 * Mobil istemci ÇEREZ TAŞIMAZ. Sunucu `/auth/login` ve `/auth/refresh`
 * yanıtlarında `access_token` + `refresh_token` + `csrf_token` bırakıyor;
 * bunlar web'in cookie-auth akışı içindir. RN'in ağ katmanı (iOS'ta
 * NSURLSession) paylaşılan bir çerez deposu tutar ve bu alan kapatılmazsa
 * çerezleri sonraki her isteğe kendiliğinden ekler — o anda sunucunun CSRF
 * muhafızı devreye girip `X-CSRF-Token` beklediği için değiştirici her istek
 * `403 Invalid CSRF token` alır. Belirti oturumun ORTASINDA çıkar: ilk 15
 * dakika sorunsuz geçer, access token yenilendiği anda checkout düşer.
 */
const NO_COOKIES = { withCredentials: false } as const;

export const api = createApiClient({
  baseURL: API_URL,
  timeout: 30000,
  ...NO_COOKIES,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Guest (unauthenticated) axios instance — token eklemez.
 * Kullanım: guest checkout, guest payment, guest order track, guest contact.
 */
export const guestApi = createApiClient({
  baseURL: API_URL,
  timeout: 30000,
  ...NO_COOKIES,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * `Accept-Language` — sunucu hata mesajları arayüz diliyle aynı dilde dönsün.
 * Gerekçesi ve ölçümü `./acceptLanguage` başında. İKİ instance'a da takılır:
 * misafir akışları (checkout, sipariş takibi, iletişim) `guestApi` üzerinden
 * gidiyor ve hata gösteren yolların çoğu tam olarak orada.
 */
const attachAcceptLanguage = (instance: typeof api) => {
  instance.interceptors.request.use((config) => {
    config.headers["Accept-Language"] = acceptLanguageHeader();
    return config;
  });
};
attachAcceptLanguage(api);
attachAcceptLanguage(guestApi);

/**
 * iOS: sunucunun "Üyeliğinizi yükseltin" türü hata metinlerini ekrana ulaşmadan
 * nötrleştir (Apple 3.1.1/3.1.3) — gerekçe `./iosNeutralErrors`. İKİ instance'a
 * da takılır. Lazy `require`: `@/lib/purchases` → `@/ui` ve i18next zincirini
 * modül yükleme sırasına bağlamamak için (`currentLocale` ile aynı desen).
 */
const attachUpsellNeutralizer = (instance: typeof api) => {
  instance.interceptors.response.use(undefined, (error) => {
    try {
      const { CAN_BUY_DIGITAL } = require("@/lib/purchases");
      const i18n = require("@/i18n/config").default;
      neutralizeUpsellError(error, (k: string) => i18n.t(k), CAN_BUY_DIGITAL);
    } catch {
      /* nötrleştirme en iyi çaba — hata akışını asla bozmaz */
    }
    return Promise.reject(error);
  });
};

// Request interceptor - add auth token
api.interceptors.request.use(
  async (config) => {
    try {
      // İsteği başlatan oturum kuşağı (`startedInClosedSession`).
      (config as { _sessionEpoch?: number })._sessionEpoch = sessionEpoch;
      const token = await SecureStore.getItemAsync("accessToken");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      logger.error("Error getting token", { err: safeError(error) });
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Banlı kullanıcı yönlendirmesi: aynı anda dönen birden çok USER_BANNED 403'ünde
// /banned ekranına tekrar tekrar replace yapmamak için flag. Çıkışta sıfırlanır.
let bannedRedirectActive = false;
export const resetBannedRedirect = () => {
  bannedRedirectActive = false;
};

/**
 * Yenilenen access token'ı zustand store'daki `token` alanına da yazar.
 *
 * SecureStore tek başına YETMİYOR: axios request interceptor'ı token'ı doğrudan
 * SecureStore'dan okuduğu için istekler çalışmaya devam eder, ama store'dan
 * okuyan tüketiciler (bearer'lı görsel header'ı — `AppImage`; socket bağlantı
 * token'ı — `useMessagingSocket`) sessiz refresh'ten sonra süresi DOLMUŞ token'ı
 * kullanmaya devam ederdi.
 *
 * `require` ile lazy import → `client.ts` ↔ `authStore` import döngüsü önlenir
 * (aşağıdaki `handleAuthFailure` ile aynı desen).
 *
 * Guard: yalnız store'da hâlâ bir oturum varken yazar. Refresh uçuştayken
 * kullanıcı çıkış yaptıysa (`logout` token'ı null'lar) zombi bir oturum
 * yazmayalım; oturum açılışında `loadToken` zaten SecureStore'dan okuyor.
 */
/**
 * Oturum kuşağı — çıkış, uçuştaki refresh'i geçersizleştirir.
 *
 * Yarış: A çıkarken bir refresh uçuşta olabilir. Tamamlanınca refresh
 * `SecureStore.setItemAsync("accessToken", …)` çalıştırıyordu; bu arada B giriş
 * yapmışsa **B'nin token'ı A'nınkiyle eziliyor** ve request interceptor'ı
 * token'ı SecureStore'dan okuduğu için B'nin TÜM istekleri A'nın token'ıyla
 * gidiyordu. `syncStoreAccessToken`'daki guard yalnız store yarısını
 * kapatıyordu — asıl sızıntı SecureStore yazımıydı.
 *
 * `logout()` kuşağı ilerletir; refresh, yazımdan ÖNCE kendi kuşağını kontrol
 * eder ve eskiyse hiçbir şey yazmaz.
 */
let sessionEpoch = 0;

/** Çıkışta çağrılır — o ana kadar uçuşta olan her refresh'i geçersiz kılar. */
export function advanceSessionEpoch(): void {
  sessionEpoch += 1;
}

function syncStoreAccessToken(newAccess: string): void {
  try {
    const { useAuthStore } = require("../../stores/authStore");
    const current = useAuthStore.getState().token;
    if (current && current !== newAccess) {
      useAuthStore.setState({ token: newAccess });
    }
  } catch {
    /* store yüklenemedi — SecureStore yazımı geçerli, istekler etkilenmez */
  }
}

/** Yenileme isteğinin üst sınırı: asılı bir refresh, tek-uçuş üzerinden HER kimlikli isteği bekletir. */
export const REFRESH_TIMEOUT_MS = 15000;

/**
 * Yenilemenin sonucu (tek-uçuş: eşzamanlı tüm 401'ler aynı sonucu paylaşır).
 * - `refreshed`: yeni access token yazıldı, istek yeniden denenir.
 * - `invalid`: sunucu refresh token'ı KESİN reddetti ya da token yok → oturum biter.
 * - `stale`: yanıt beklenirken oturum kapandı / değişti → ne yazılır ne çıkış yapılır.
 * - `transient`: ağ / zaman aşımı / 5xx / 429 / anahtar zinciri okunamadı → oturum korunur,
 *   istek bu hatayla reddedilir (bkz. `./refreshFailure`).
 */
type RefreshResult =
  | { status: "refreshed"; accessToken: string }
  | { status: "invalid" }
  | { status: "stale" }
  | { status: "transient"; error: unknown };

async function performTokenRefresh(): Promise<RefreshResult> {
  // İsteği başlatan oturum. Yanıt döndüğünde hâlâ aynı kuşaktaysak yazarız.
  const epochAtStart = sessionEpoch;
  const sessionChanged = () => epochAtStart !== sessionEpoch || isLogoutInProgress();
  // Çıkış sürerken yenileme YOK: çıkışın kendi isteği (push iptali) 401 alırsa yenilenen
  // token'lar SecureStore'a yazılır, çıkış temizliğiyle yarışır ve kalırsa sonraki açılışta
  // `loadToken` kapanmış oturumu diriltirdi.
  if (isLogoutInProgress()) return { status: "stale" };
  let refreshToken: string | null;
  try {
    refreshToken = await SecureStore.getItemAsync("refreshToken");
  } catch (error) {
    // Anahtar zinciri okunamadı (ör. cihaz kilidi açılmadan arka planda açılış): bu
    // "oturum yok" DEĞİL — token'lar duruyor, sonraki istek yeniden dener.
    return { status: "transient", error };
  }
  if (!refreshToken) return { status: "invalid" };
  // Çıplak `axios` — instance'ların ayarını miras ALMAZ, o yüzden çerez kapısı
  // burada tekrar edilir. Yenileme, çerezlerin sızdığı iki uçtan biridir.
  // Süre sınırı iki katmanlı: axios `timeout` + AbortController (asılı bir soket
  // `timeout`'u her ağ yığınında tetiklemeyebilir). Zaman aşımı GEÇİCİDİR.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REFRESH_TIMEOUT_MS);
  let response;
  try {
    response = await axios.post(
      `${API_URL}/auth/refresh`,
      { refreshToken },
      { ...NO_COOKIES, timeout: REFRESH_TIMEOUT_MS, signal: controller.signal },
    );
  } catch (error) {
    if (sessionChanged()) return { status: "stale" };
    return refreshFailureKind(error) === "invalid"
      ? { status: "invalid" }
      : { status: "transient", error };
  } finally {
    clearTimeout(timer);
  }
  const data: any = response.data;
  const newAccess: string | undefined =
    data?.tokens?.accessToken ?? data?.accessToken;
  const newRefresh: string | undefined =
    data?.tokens?.refreshToken ?? data?.refreshToken;
  // Uçuştayken çıkış yapıldı: bu token artık kapanmış bir oturuma ait. Yazarsak
  // bu arada giriş yapmış olan kullanıcının token'ını ezeriz.
  // Yanıt beklenirken çıkış başladıysa da (kuşak aynı kalsa bile) yazma/uygulama yok.
  if (sessionChanged()) return { status: "stale" };
  // 2xx ama token yok: sunucu token'ı reddetmedi (beklenmeyen gövde) — oturum korunur.
  if (!newAccess) {
    return { status: "transient", error: new Error("Refresh response without access token") };
  }
  await SecureStore.setItemAsync("accessToken", newAccess);
  // ROTATED refresh token'ı da kaydet (asıl bug buydu).
  if (newRefresh) await SecureStore.setItemAsync("refreshToken", newRefresh);
  syncStoreAccessToken(newAccess);
  return { status: "refreshed", accessToken: newAccess };
}

// Tek-uçuş refresh: eşzamanlı 401'ler tek refresh paylaşır (rotated token + storm önlenir).
const refreshAccessToken = singleFlight(performTokenRefresh);

/** Süren bir çıkış var mı? (lazy require — api ↔ authStore döngüsü) */
function isLogoutInProgress(): boolean {
  try {
    const store = require("../../stores/authStore");
    return typeof store.isLogoutInProgress === "function" && store.isLogoutInProgress();
  } catch {
    return false;
  }
}

/**
 * İstek, şu an kapanmış bir oturumda mı başladı? (çıkış kuşağı ilerledi.) Böyle bir 401
 * yeni oturumu ilgilendirmez: refresh/yeniden deneme/zorunlu çıkış yapılmaz — yoksa hesap
 * silme ya da çıkış sonrası geç dönen bir 401 kullanıcıyı login'e atar (ya da B'nin
 * token'ıyla A'nın isteğini yeniden dener).
 */
function startedInClosedSession(config?: { _sessionEpoch?: number }): boolean {
  return typeof config?._sessionEpoch === "number" && config._sessionEpoch !== sessionEpoch;
}

async function handleAuthFailure(error?: unknown): Promise<void> {
  // Çıkış zaten sürüyor (ör. çıkışın kendi push iptali 401 aldı): ikinci çıkış ve
  // yönlendirme YOK. Beklemek de yok — o çıkış bu isteğin bitmesini bekliyor olabilir.
  if (isLogoutInProgress()) return;
  // Bu dal kullanıcıyı AÇIKLAMASIZ login'e atıyor ve bugün hiçbir iz bırakmıyor.
  // Ayrımı (EMAIL_NOT_VERIFIED / IP-blok 403) kör yazmıyoruz — gövdeleri canlı
  // üretilemedi (denetim 2026-08-03 §5.3). Onun yerine ayırt edici alanları +
  // `x-request-id`'yi raporluyoruz: gerçek gövde bir kez görülünce ayrım tek
  // satırda takılacak. Rapor PII taşımaz (bkz. `./requestId`).
  const fingerprint = errorFingerprint(error);
  logger.debug("[auth] silent logout", { ...fingerprint });
  captureException(error ?? new Error("Auth failure without an error object"), {
    level: "warning",
    tags: { requestId: fingerprint.requestId ?? "none" },
    extra: { ...fingerprint },
  });

  // Merkezi çıkış: SecureStore + Zustand + query cache + socket + push temizlenir.
  // require ile lazy import → api.ts ↔ authStore döngüsü (cycle) önlenir.
  try {
    const { useAuthStore } = require("../../stores/authStore");
    // Zorunlu çıkış: ödeme yetki belirteçleri silinmez (3DS sürerken başka bir
    // isteğin 401'i süren ödemeyi düşürmesin); başka hesapla girişte silinir.
    await useAuthStore.getState().logout({ reason: "forced" });
  } catch {
    await SecureStore.deleteItemAsync("accessToken");
    await SecureStore.deleteItemAsync("refreshToken");
  }
  // Doğrulanmamış e-posta, "oturumun bitti" ile aynı şey değil: kullanıcıyı
  // açıklamasız login ekranına atmak, yapması gereken şeyi (e-postayı
  // doğrulamak) gizler. Ayrım ölçülmüş kanıta dayanıyor ve tanınmayan her
  // gövde için davranış AYNEN korunuyor (bkz. `./authFailureKind`).
  router.replace(
    authFailureKind(error) === "emailNotVerified"
      ? "/(auth)/verify-email"
      : "/(auth)/login",
  );
}

/**
 * Kimlik SUNAN uçlar. Buradaki 401 "oturumun bitti" değil, "kimlik
 * doğrulanamadı" demektir — kullanıcının zaten oturumu yoktur.
 *
 * Canlıda ölçülen hata (31 Ağu 2026): production Apple token'ını
 * `jwt audience invalid` ile reddedip 401 döndü; interceptor bunu oturum sonu
 * sanıp `logout()` çalıştırdı, `logout()` içindeki `getExpoPushTokenAsync`
 * gerçek cihazda asılı kaldı ve interceptor HİÇ reject etmedi. Giriş butonu
 * sonsuza kadar "Giriş yapılıyor..." durumunda kaldı, kullanıcı hata görmedi.
 *
 * Bu listedeki uçlarda 401 doğrudan çağırana verilir; çağıran kendi hatasını
 * gösterir. Korumalı uçlarda (örn. /users/me) davranış AYNEN korunur.
 */
const PUBLIC_AUTH_PATHS = [
  "/auth/login",
  "/auth/register",
  "/auth/google",
  "/auth/apple",
  "/auth/refresh",
  "/auth/logout",
  "/auth/check-email",
  "/auth/resend-verification",
] as const;

const isPublicAuthRequest = (config?: { url?: string }): boolean => {
  const url = config?.url ?? "";
  return PUBLIC_AUTH_PATHS.some((path) => url.includes(path));
};

/**
 * Geçici refresh hatasını ASIL isteğin hatası olarak biçimler: durum/gövde/kod
 * yenilemeden gelir (ağ hatası → yanıtsız, 5xx/429 → o durum), `config` asıl isteğindir.
 * Yenileme hatasının kendisi verilmez — onun `config.data`'sı refresh token'ı taşır ve
 * çağıranın hata raporuna (Sentry) sızardı. Zaman aşımı iptali (`ERR_CANCELED`) kullanıcı
 * iptali sanılmasın diye `ECONNABORTED` olur.
 */
function asTransientRefreshError(original: Record<string, unknown>, refreshError: unknown): unknown {
  const source = refreshError as
    | { response?: { status?: number; statusText?: string; headers?: unknown; data?: unknown }; code?: string; message?: string }
    | null
    | undefined;
  const response = source?.response;
  original.response = response
    ? {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data,
        config: original.config,
      }
    : undefined;
  original.status = response?.status;
  if (source?.code) original.code = source.code === "ERR_CANCELED" ? "ECONNABORTED" : source.code;
  if (typeof source?.message === "string") original.message = source.message;
  original.refreshTransient = true;
  return original;
}

// Response interceptor - handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Banlı kullanıcı: backend BannedUserGuard tüm istekleri 403 + USER_BANNED
    // ile bloklar (logout ve destek talebi hariç). Kullanıcıyı tam ekran
    // /banned ekranına kilitle.
    const errData = error.response?.data;
    if (
      error.response?.status === 403 &&
      errData?.errorCode === "USER_BANNED"
    ) {
      if (!bannedRedirectActive) {
        bannedRedirectActive = true;
        router.replace({
          pathname: "/banned",
          params: errData.bannedReason
            ? { reason: errData.bannedReason }
            : undefined,
        });
      }
      return Promise.reject(error);
    }

    // 2FA kod uçları: 401 "yanlış kod" olabilir (eski sunucu) — oturum hatası DEĞİL.
    // Yanlış kod doğrudan çağırana; bayat access token ise bir kez yenilenip
    // yeniden denenir, ama bu uçlar hiçbir koşulda sessiz çıkış yaptırmaz
    // (gerekçe ve ölçüm `./twoFactorCodeError`).
    if (
      error.response?.status === 401 &&
      originalRequest &&
      isTwoFactorCodeRequest(originalRequest)
    ) {
      if (originalRequest._retry || isInvalidTwoFactorCode(error)) {
        return Promise.reject(error);
      }
      originalRequest._retry = true;
      try {
        const result = await refreshAccessToken();
        if (result.status === "refreshed") {
          originalRequest.headers.Authorization = `Bearer ${result.accessToken}`;
          return api(originalRequest);
        }
      } catch {
        /* refresh düştü — hata alanın altında gösterilir, çıkış yok */
      }
      return Promise.reject(error);
    }

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isPublicAuthRequest(originalRequest) &&
      !startedInClosedSession(originalRequest)
    ) {
      originalRequest._retry = true;
      // 401'in işlendiği oturum. Refresh beklenirken çıkış + yeni giriş olduysa, eski
      // oturumun refresh sonucu YENİ oturumu kapatmamalı.
      const epochAtFailure = sessionEpoch;
      let result: RefreshResult;
      try {
        result = await refreshAccessToken();
      } catch (refreshError) {
        // `performTokenRefresh` sınıflandırılmış sonuç döndürür; buraya düşen beklenmeyen
        // bir hatadır (ör. SecureStore yazımı) — oturumu korumak güvenli taraftır.
        result = { status: "transient", error: refreshError };
      }
      if (result.status === "refreshed") {
        originalRequest.headers.Authorization = `Bearer ${result.accessToken}`;
        return api(originalRequest);
      }
      if (result.status === "transient") {
        // Oturum KORUNUR (token'lar + kullanıcı). Çağırana yenilemenin hatası verilir:
        // ağ hatası / 5xx olarak görünür (çevrimdışı diyaloğu, "tekrar dene"); asıl 401
        // verilseydi açılış doğrulaması gibi çağıranlar onu "oturum bitti" sanardı.
        return Promise.reject(asTransientRefreshError(error, result.error));
      }
      if (result.status === "invalid" && epochAtFailure === sessionEpoch) {
        await handleAuthFailure(error);
      }
    }

    return Promise.reject(error);
  },
);

// Helper: Response parsing (web ile aynı)
export const parseResponse = (response: any) => {
  return response.data?.data || response.data?.products || response.data || [];
};

export default api;

// Token yenileme interceptor'ından SONRA kaydedilir: yenileme/yeniden deneme
// önce çalışır, nötrleştirme yalnız ekrana ulaşacak son hataya uygulanır.
attachUpsellNeutralizer(api);
attachUpsellNeutralizer(guestApi);

/**
 * Sunucudan yanıt gelmeden düşen istekleri (ağ hatası) kaydeder: global çevrimdışı diyaloğu açıkken
 * aynı olayın istek bazlı hata toast'ı ikinci kez çıkmasın (`@/lib/network`, toast süzgeci).
 * Hatayı değiştirmez / yutmaz.
 */
const attachNetworkFailureNote = (instance: typeof api) => {
  instance.interceptors.response.use(undefined, (error) => {
    noteNetworkFailure(error);
    return Promise.reject(error);
  });
};
attachNetworkFailureNote(api);
attachNetworkFailureNote(guestApi);
