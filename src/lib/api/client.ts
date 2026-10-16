import { logger, safeError } from '@/services/logger';
import { axios, createApiClient, singleFlight } from "@/lib/api-client";
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
import { resolveApiBaseUrl } from "./baseUrl";
import { apiPath } from "./path";
import {
  advanceSessionEpoch,
  claimBannedRedirect,
  getSessionEpoch,
  isSessionDeferred,
  setSessionDeferred,
} from "./sessionState";
import { clearStoredTokens, readAccessToken, readRefreshToken, writeTokenPair } from "./tokenStorage";

export {
  advanceSessionEpoch,
  getSessionEpoch,
  isSessionDeferred,
  resetBannedRedirect,
  setSessionDeferred,
  SESSION_PROBE,
} from "./sessionState";

// API URL çözümleme kuralı tek kaynakta: `./baseUrl` (env → Expo LAN host → emülatör).
const API_URL = resolveApiBaseUrl();

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
  // `userId` sunucu/route verisi — yol segmenti olarak kodlanır (`./path`).
  const base = `${API_URL}${apiPath`/users/${userId}/avatar`}`;
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

/** İstek config'ine interceptor'ların eklediği iç alanlar. */
type SessionRequestConfig = {
  /** İsteği başlatan oturum kuşağı (`startedInClosedSession`). */
  _sessionEpoch?: number;
  /** Ertelenmiş oturumu yeniden deneyen istek (`SESSION_PROBE`) — Bearer taşır. */
  _sessionProbe?: boolean;
  /** Ertelenmiş oturumda Bearer'sız (misafir olarak) gitti — 401'i oturumla ilgisiz. */
  _sentAsGuest?: boolean;
  /** Saklı token YOKTU (gerçek misafir ya da token'lar silinmiş) — Bearer'sız gitti. */
  _sentWithoutToken?: boolean;
};

// Request interceptor - add auth token
api.interceptors.request.use(
  async (config) => {
    try {
      const meta = config as SessionRequestConfig;
      meta._sessionEpoch = getSessionEpoch();
      // Ertelenmiş (doğrulanmamış) oturum: arayüz misafir → istek de misafir gider; saklı
      // token yalnız oturumu yeniden deneyen açılış isteğinde kullanılır (`./sessionState`).
      if (isSessionDeferred() && !meta._sessionProbe) {
        meta._sentAsGuest = true;
        return config;
      }
      const token = await readAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        meta._sentWithoutToken = true;
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
/*
 * Oturum kuşağı (`./sessionState`) — çıkış, uçuştaki refresh'i geçersizleştirir.
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
  const epochAtStart = getSessionEpoch();
  const sessionChanged = () => epochAtStart !== getSessionEpoch() || isLogoutInProgress();
  // Çıkış sürerken yenileme YOK: çıkışın kendi isteği (push iptali) 401 alırsa yenilenen
  // token'lar SecureStore'a yazılır, çıkış temizliğiyle yarışır ve kalırsa sonraki açılışta
  // `loadToken` kapanmış oturumu diriltirdi.
  if (isLogoutInProgress()) return { status: "stale" };
  let refreshToken: string | null;
  try {
    refreshToken = await readRefreshToken();
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
  // Çift tutarlı yazılır (önce ROTATED refresh, sonra access; hata → ikisi de silinir) ve
  // kuyrukta sırası geldiğinde kuşak değiştiyse (çıkış / başka hesapla giriş) hiç yazılmaz.
  const written = await writeTokenPair(
    { accessToken: newAccess, refreshToken: newRefresh },
    { epoch: epochAtStart },
  );
  if (!written || sessionChanged()) return { status: "stale" };
  syncStoreAccessToken(newAccess);
  return { status: "refreshed", accessToken: newAccess };
}

// Tek-uçuş refresh: eşzamanlı 401'ler tek refresh paylaşır (rotated token + storm önlenir).
const refreshAccessToken = singleFlight(performTokenRefresh);

/**
 * Arayüz şu an oturumu AÇIK mı gösteriyor? (lazy require — api ↔ authStore döngüsü.)
 * Store yüklenemezse eski davranış korunur (açık sayılır).
 */
function isSignedInSession(): boolean {
  try {
    const { useAuthStore } = require("../../stores/authStore");
    return useAuthStore.getState().isAuthenticated === true;
  } catch {
    return true;
  }
}

/**
 * Sessiz refresh'i dışarıdan (ör. socket kimlik hatası) tetikler; eşzamanlı 401'lerle aynı
 * tek-uçuşu paylaşır. Yeni access token'ı döndürür; yenilenemediyse `null` (oturum kararı —
 * kesin red → zorunlu çıkış — bir sonraki HTTP 401'inde verilir, burada verilmez).
 */
export async function refreshAccessTokenNow(): Promise<string | null> {
  if (isSessionDeferred() || !isSignedInSession()) return null;
  try {
    const result = await refreshAccessToken();
    return result.status === "refreshed" ? result.accessToken : null;
  } catch {
    return null;
  }
}

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
function startedInClosedSession(config?: SessionRequestConfig): boolean {
  return typeof config?._sessionEpoch === "number" && config._sessionEpoch !== getSessionEpoch();
}

/** Oturum değişti (bayat) hatasının kodu — bkz. `sessionStaleError`. */
export const SESSION_STALE = "SESSION_STALE";

/**
 * İstek ya da onun refresh'i beklenirken oturum değişti (çıkış / başka hesapla giriş /
 * token'lar silindi). Asıl 401 çağırana VERİLMEZ: 401'e göre dallanan çağıranlar (açılış
 * doğrulaması, `loadToken`'ın eski yolu…) onu "oturum bitti" sanıp YENİ oturumun token'larını
 * silebilirdi. Yanıtsız, 401 olmayan ayrı bir hata: `code: SESSION_STALE`. `isAxiosError`
 * korunur (toast metni teknik mesaj değil çağıranın yedek metni olsun); ağ hatası SAYILMAZ
 * (`@/lib/network/networkFailure`). `config` asıl isteğindir.
 */
function sessionStaleError(original: { config?: unknown }): Error {
  return Object.assign(new Error("Session changed while the request was in flight"), {
    isAxiosError: true,
    code: SESSION_STALE,
    config: original.config,
    sessionStale: true,
  });
}

/** Hata, oturum değişimi yüzünden reddedilmiş bir istek mi? (`SESSION_STALE`) */
export function isSessionStaleError(error: unknown): boolean {
  return (error as { code?: unknown } | null | undefined)?.code === SESSION_STALE;
}

async function handleAuthFailure(error?: unknown): Promise<void> {
  // Çıkış zaten sürüyor (ör. çıkışın kendi push iptali 401 aldı): ikinci çıkış ve
  // yönlendirme YOK. Beklemek de yok — o çıkış bu isteğin bitmesini bekliyor olabilir.
  if (isLogoutInProgress()) return;
  // Ertelenmiş (doğrulanmamış) oturum: kullanıcı oturumu hiç açık GÖRMEDİ (arayüz misafir).
  // Zorunlu çıkış (misafir sepeti/verisi sıfırlanır) ve login yönlendirmesi YOK; saklı
  // oturum sessizce atılır (`discardStoredSession`).
  // Arayüz oturumu açık GÖSTERMİYORSA (gerçek misafir; açılışta oturum henüz yüklenmedi) da
  // aynı: kullanıcı mevcut ekranda kalır, misafir verisi sıfırlanmaz, login'e atılmaz — girişi
  // gerektiren ekranlar kendi kapısını gösterir. Saklı (geçersiz) oturum sessizce atılır.
  const deferred = isSessionDeferred() || !isSignedInSession();
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
    const { useAuthStore, discardStoredSession } = require("../../stores/authStore");
    if (deferred) {
      await discardStoredSession();
    } else {
      // Zorunlu çıkış: ödeme yetki belirteçleri silinmez (3DS sürerken başka bir
      // isteğin 401'i süren ödemeyi düşürmesin); başka hesapla girişte silinir.
      await useAuthStore.getState().logout({ reason: "forced" });
    }
  } catch {
    // Yedek temizlik de oturumu değiştirir: kuşak ilerler, uçuştaki refresh silinen
    // oturumun token'ını geri yazmaz, 401'e göre dallanan çağıranlar bayat sonucu uygulamaz.
    advanceSessionEpoch();
    setSessionDeferred(false);
    await clearStoredTokens();
  }
  if (deferred) return;
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
      // Bayrak `./sessionState`'te: her giriş/çıkışta sıfırlanır (sonraki oturum takılı kalmaz).
      if (claimBannedRedirect()) {
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
      originalRequest &&
      !originalRequest._retry &&
      !isPublicAuthRequest(originalRequest)
    ) {
      // Ertelenmiş oturumda misafir olarak (Bearer'sız) giden isteğin 401'i oturumla ilgisiz:
      // refresh / zorunlu çıkış / login yönlendirmesi YOK, hata olduğu gibi çağırana.
      if ((originalRequest as SessionRequestConfig)._sentAsGuest) return Promise.reject(error);
      // Gerçek misafirin (token yok, arayüz misafir) korumalı uca isteği: 401 "giriş gerekli"
      // demektir, oturum bitmedi. Refresh / zorunlu çıkış / login yönlendirmesi YOK — misafir
      // bulunduğu ekranda kalır; girişi gerektiren ekranlar kendini kapılar. (Arayüz oturumu
      // açık gösterirken token'sız giden istek bozuk oturumdur — aşağıdaki normal yol.)
      if ((originalRequest as SessionRequestConfig)._sentWithoutToken && !isSignedInSession()) {
        return Promise.reject(error);
      }
      // Kapanmış bir oturumda başlayan isteğin 401'i yeni oturumu ilgilendirmez.
      if (startedInClosedSession(originalRequest)) return Promise.reject(sessionStaleError(error));
      originalRequest._retry = true;
      // 401'in işlendiği oturum. Refresh beklenirken çıkış + yeni giriş olduysa, eski
      // oturumun refresh sonucu YENİ oturumu kapatmamalı.
      const epochAtFailure = getSessionEpoch();
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
      // Bayat: refresh beklenirken oturum değişti. Asıl 401 verilseydi çağıran onu YENİ
      // oturumun sonu sanıp token'larını silebilirdi.
      if (result.status === "stale" || epochAtFailure !== getSessionEpoch()) {
        return Promise.reject(sessionStaleError(error));
      }
      await handleAuthFailure(error);
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
