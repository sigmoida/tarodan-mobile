import { axios, createApiClient, singleFlight } from "@/lib/api-client";
import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { captureException } from "@/services/sentry";
import { errorFingerprint } from "./requestId";
import { authFailureKind } from "./authFailureKind";
import { acceptLanguageHeader } from "./acceptLanguage";

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

console.log("📡 API URL:", API_URL);
console.log("📱 Platform:", Platform.OS);
console.log("🌐 Expo Host:", Constants.expoConfig?.hostUri);

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

// Request interceptor - add auth token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync("accessToken");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error("Error getting token:", error);
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

async function performTokenRefresh(): Promise<string | null> {
  // İsteği başlatan oturum. Yanıt döndüğünde hâlâ aynı kuşaktaysak yazarız.
  const epochAtStart = sessionEpoch;
  const refreshToken = await SecureStore.getItemAsync("refreshToken");
  if (!refreshToken) return null;
  // Çıplak `axios` — instance'ların ayarını miras ALMAZ, o yüzden çerez kapısı
  // burada tekrar edilir. Yenileme, çerezlerin sızdığı iki uçtan biridir.
  const response = await axios.post(
    `${API_URL}/auth/refresh`,
    { refreshToken },
    NO_COOKIES,
  );
  const data: any = response.data;
  const newAccess: string | undefined =
    data?.tokens?.accessToken ?? data?.accessToken;
  const newRefresh: string | undefined =
    data?.tokens?.refreshToken ?? data?.refreshToken;
  if (!newAccess) return null;
  // Uçuştayken çıkış yapıldı: bu token artık kapanmış bir oturuma ait. Yazarsak
  // bu arada giriş yapmış olan kullanıcının token'ını ezeriz.
  if (epochAtStart !== sessionEpoch) return null;
  await SecureStore.setItemAsync("accessToken", newAccess);
  // ROTATED refresh token'ı da kaydet (asıl bug buydu).
  if (newRefresh) await SecureStore.setItemAsync("refreshToken", newRefresh);
  syncStoreAccessToken(newAccess);
  return newAccess;
}

// Tek-uçuş refresh: eşzamanlı 401'ler tek refresh paylaşır (rotated token + storm önlenir).
const refreshAccessToken = singleFlight(performTokenRefresh);

async function handleAuthFailure(error?: unknown): Promise<void> {
  // Bu dal kullanıcıyı AÇIKLAMASIZ login'e atıyor ve bugün hiçbir iz bırakmıyor.
  // Ayrımı (EMAIL_NOT_VERIFIED / IP-blok 403) kör yazmıyoruz — gövdeleri canlı
  // üretilemedi (denetim 2026-08-03 §5.3). Onun yerine ayırt edici alanları +
  // `x-request-id`'yi raporluyoruz: gerçek gövde bir kez görülünce ayrım tek
  // satırda takılacak. Rapor PII taşımaz (bkz. `./requestId`).
  const fingerprint = errorFingerprint(error);
  if (__DEV__) console.warn("[auth] silent logout", fingerprint);
  captureException(error ?? new Error("Auth failure without an error object"), {
    level: "warning",
    tags: { requestId: fingerprint.requestId ?? "none" },
    extra: { ...fingerprint },
  });

  // Merkezi çıkış: SecureStore + Zustand + query cache + socket + push temizlenir.
  // require ile lazy import → api.ts ↔ authStore döngüsü (cycle) önlenir.
  try {
    const { useAuthStore } = require("../../stores/authStore");
    await useAuthStore.getState().logout();
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

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isPublicAuthRequest(originalRequest)
    ) {
      originalRequest._retry = true;
      try {
        const newAccess = await refreshAccessToken();
        if (newAccess) {
          originalRequest.headers.Authorization = `Bearer ${newAccess}`;
          return api(originalRequest);
        }
        await handleAuthFailure(error);
      } catch (refreshError) {
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
