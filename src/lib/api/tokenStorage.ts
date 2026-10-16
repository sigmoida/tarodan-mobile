import * as SecureStore from "expo-secure-store";
import { getSessionEpoch } from "./sessionState";

/**
 * Oturum token'larının TEK okuma/yazma yeri (SecureStore). Bağımlılıksız: istemci (`./client`),
 * `authStore` ve açılış hazırlığı (`@/stores/secureSessionSetup`) buradan okur/yazar.
 *
 * Anahtar adları bilinçli olarak eski sürümlerle aynı (`accessToken` / `refreshToken`):
 * güncellenen kurulumların oturumu taşınmadan sürer.
 */
export const ACCESS_TOKEN_KEY = "accessToken";
export const REFRESH_TOKEN_KEY = "refreshToken";

/**
 * iOS anahtar zinciri erişilebilirliği: `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`.
 * - AFTER_FIRST_UNLOCK: cihaz yeniden başladıktan sonraki ilk kilit açılışından itibaren
 *   kilitliyken de okunur/yazılır — arka planda açılan uygulama (push bildirimi, arka plan
 *   token yenilemesi) token'ı okuyabilsin. `WHEN_UNLOCKED` (varsayılan) kilitli ekranda
 *   okuma/yazmayı reddediyordu; arka plandaki yenileme döndürülen refresh token'ı yazamıyordu.
 * - THIS_DEVICE_ONLY: token'lar iCloud Anahtar Zinciri / şifreli yedekle başka cihaza taşınmaz
 *   (yedekten geri yüklenen telefon eski oturumu taşımaz).
 * Android'de seçenek yok sayılır (Keystore). Eski öğeler bu seçenekle yeniden yazılır
 * (`migrateKeychainAccessibility`).
 */
export const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

/*
 * Token yazımları SIRALI çalışır (tek kuyruk): giriş, çıkış temizliği ve sessiz refresh'in
 * yazımları iç içe geçmez — ör. bir refresh'in access yazımı ile girişin refresh yazımı
 * karışıp iki farklı oturumun token'ları yan yana kalmaz.
 */
let queue: Promise<unknown> = Promise.resolve();

/** Token deposuna dokunan bir işi kuyrukta (öncekiler bitince) çalıştırır. */
export function runTokenStorageExclusive<T>(op: () => Promise<T>): Promise<T> {
  const run = queue.then(op, op);
  queue = run.catch(() => undefined);
  return run;
}

export function readAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export function readRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export interface TokenPair {
  accessToken: string;
  /**
   * `string` yazılır; `null` saklı refresh token SİLİNİR (girişte yanıt refresh vermediyse
   * önceki oturumun refresh'i kalmasın); `undefined` dokunulmaz (refresh yanıtı döndürmediyse).
   */
  refreshToken?: string | null;
}

async function deleteQuietly(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    /* en iyi çaba */
  }
}

/**
 * Token çiftini tutarlı yazar.
 * - Sıra: önce refresh (uzun ömürlü, sunucuda döndürülen), sonra access. Access yazımı
 *   düşerse elde yeni refresh kalır; sonraki 401'de yenilenir.
 * - Herhangi bir yazım HATA verirse ikisi de silinir ve hata fırlatılır: yarım çift (yeni access
 *   + önceki oturumun refresh'i) asla kalmaz — kalırsa sonraki yenileme başka hesabın oturumunu
 *   diriltebilirdi.
 * - `epoch` verilirse yazım, kuyrukta sırası geldiğinde oturum kuşağı hâlâ aynıysa yapılır;
 *   değiştiyse (çıkış / başka hesapla giriş) hiçbir şey yazılmaz ve `false` döner.
 */
export function writeTokenPair(
  pair: TokenPair,
  { epoch }: { epoch?: number } = {},
): Promise<boolean> {
  return runTokenStorageExclusive(async () => {
    if (epoch !== undefined && epoch !== getSessionEpoch()) return false;
    try {
      if (typeof pair.refreshToken === "string" && pair.refreshToken) {
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, pair.refreshToken, SECURE_STORE_OPTIONS);
      } else if (pair.refreshToken === null || pair.refreshToken === "") {
        await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      }
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, pair.accessToken, SECURE_STORE_OPTIONS);
      return true;
    } catch (error) {
      await deleteQuietly(ACCESS_TOKEN_KEY);
      await deleteQuietly(REFRESH_TOKEN_KEY);
      throw error;
    }
  });
}

/** İki token'ı da siler (en iyi çaba, fırlatmaz) — kuyrukta, bekleyen yazımlardan sonra. */
export function clearStoredTokens(): Promise<void> {
  return runTokenStorageExclusive(async () => {
    await deleteQuietly(ACCESS_TOKEN_KEY);
    await deleteQuietly(REFRESH_TOKEN_KEY);
  });
}
