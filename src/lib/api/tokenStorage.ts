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

/*
 * Açılış hazırlığı kapısı (`@/stores/secureSessionSetup`): yeniden kurulum temizliği bitmeden
 * HİÇBİR okuma (açılış, istek interceptor'ı, refresh) saklı token'ı görmez — yoksa uygulama
 * silinip yeniden kurulduğunda bayat oturum, temizlik bitmeden bir istekte kullanılabilirdi.
 * Kapı sınırlıdır (`READY_GATE_MAX_MS`): hazırlık asılı kalırsa okumalar sonsuza dek beklemez.
 */
const READY_GATE_MAX_MS = 5000;
let readyGate: Promise<unknown> = Promise.resolve();

export function setTokenStorageReadyGate(ready: Promise<unknown>): void {
  readyGate = Promise.race([
    ready.catch(() => undefined),
    new Promise((resolve) => setTimeout(resolve, READY_GATE_MAX_MS)),
  ]);
}

/*
 * Yeniden kurulum adayı ama saklı oturum silinemedi (kontrol çözülmedi): bu açılışta saklı
 * token'lar YOK sayılır (okumalar null). Kullanıcı bu açılışta giriş yapar ve yeni çift
 * yazılırsa saklı oturum artık bu kurulumundur — bastırma kalkar ve kontrol çözüldü sayılır.
 */
let storedSessionSuppressed = false;
let onFreshSessionWritten: (() => void) | null = null;

export function suppressStoredSession(onResolved: () => void): void {
  storedSessionSuppressed = true;
  onFreshSessionWritten = onResolved;
}

/** YALNIZ TEST. */
export function resetTokenStorageForTests(): void {
  readyGate = Promise.resolve();
  storedSessionSuppressed = false;
  onFreshSessionWritten = null;
}

async function readGated(key: string): Promise<string | null> {
  await readyGate;
  if (storedSessionSuppressed) return null;
  return SecureStore.getItemAsync(key);
}

export function readAccessToken(): Promise<string | null> {
  return readGated(ACCESS_TOKEN_KEY);
}

export function readRefreshToken(): Promise<string | null> {
  return readGated(REFRESH_TOKEN_KEY);
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
 * - Sıra: önce refresh (uzun ömürlü, sunucuda döndürülen), sonra access.
 * - Refresh yazımı (ya da silinmesi) HATA verirse ikisi de silinir ve hata fırlatılır: yarım çift
 *   (yeni access + önceki oturumun refresh'i) asla kalmaz — kalsaydı sonraki yenileme başka
 *   hesabın oturumunu diriltebilirdi.
 * - Access yazımı HATA verirse yeni refresh KALIR (sunucuda döndürülmüş olabilir; atılırsa oturum
 *   kaybolur), eski access silinir ve hata fırlatılır: sonraki istek token'sız gider, 401'de
 *   yeni refresh'le yenilenir. Önceki oturumun access'i yeni refresh'in yanında kalmaz.
 * - `epoch` verilirse yazım, kuyrukta sırası geldiğinde oturum kuşağı hâlâ aynıysa yapılır;
 *   değiştiyse (çıkış / başka hesapla giriş / yeniden kurulum temizliği) hiçbir şey yazılmaz
 *   ve `false` döner.
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
    } catch (error) {
      await deleteQuietly(ACCESS_TOKEN_KEY);
      await deleteQuietly(REFRESH_TOKEN_KEY);
      throw error;
    }
    try {
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, pair.accessToken, SECURE_STORE_OPTIONS);
    } catch (error) {
      await deleteQuietly(ACCESS_TOKEN_KEY);
      throw error;
    }
    if (storedSessionSuppressed) {
      // Bu kurulumun kendi oturumu yazıldı: bayat oturum ezildi, kontrol çözüldü.
      storedSessionSuppressed = false;
      const resolved = onFreshSessionWritten;
      onFreshSessionWritten = null;
      resolved?.();
    }
    return true;
  });
}

/** İki token'ı da siler (en iyi çaba, fırlatmaz) — kuyrukta, bekleyen yazımlardan sonra. */
export function clearStoredTokens(): Promise<void> {
  return runTokenStorageExclusive(async () => {
    await deleteQuietly(ACCESS_TOKEN_KEY);
    await deleteQuietly(REFRESH_TOKEN_KEY);
  });
}
