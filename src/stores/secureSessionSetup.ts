import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  SECURE_STORE_OPTIONS,
  runTokenStorageExclusive,
  setTokenStorageReadyGate,
  suppressStoredSession,
} from "@/lib/api/tokenStorage";
import { advanceSessionEpoch } from "@/lib/api/sessionState";
import { USER_SNAPSHOT_KEY } from "./userSnapshot";
import { logger, safeError } from "../services/logger";

/**
 * Açılışta, oturum yüklenmeden (`authStore.loadToken`) ÖNCE çalışan güvenli depo hazırlığı.
 *
 * 1) Yeniden kurulum: iOS anahtar zinciri uygulama SİLİNİNCE silinmez — uygulamayı silip yeniden
 *    kuran kullanıcı önceki oturumla (ortak cihazda başka birinin oturumuyla) açılıyordu.
 *    AsyncStorage ise silmede silinir: "kurulum işareti" yoksa bu kurulumun ilk açılışıdır ve
 *    saklı token'lar + kullanıcı görüntüsü bayattır → silinir.
 *    Bu sürüme GÜNCELLEYEN kurulumda da işaret yoktur (özellik yeni); onu yeniden kurulumdan
 *    ayıran şey AsyncStorage'ın boş olmamasıdır (sepet, katalog önbelleği, dil… — kullanılmış
 *    her kurulumda vardır). Boş AsyncStorage + işaret yok = yeni/yeniden kurulum.
 * 2) iOS erişilebilirlik göçü: eski sürümlerin yazdığı öğeler varsayılan `WHEN_UNLOCKED` ile
 *    duruyor; expo-secure-store var olan öğeyi güncellerken erişilebilirliği DEĞİŞTİRMEZ
 *    (yalnız değeri yazar). Bu yüzden öğe bir kez okunup silinir ve `SECURE_STORE_OPTIONS`
 *    ile yeniden yazılır; bitince işaret konur.
 *
 * İkisi de en iyi çabadır ve fırlatmaz: anahtar zinciri okunamıyorsa (kilitli cihazda arka plan
 * açılışı) işaret KONMAZ, bir sonraki açılışta yeniden denenir.
 */

/** AsyncStorage: bu kurulum en az bir kez açıldı (uygulama silinince AsyncStorage ile silinir). */
export const INSTALL_MARKER_KEY = "tarodan.install.v1";
/**
 * AsyncStorage: bu kurulum yeni/yeniden kurulum ADAYI ama bayat oturum henüz silinemedi. Sonraki
 * açılışta (o arada AsyncStorage dolmuş olsa da) kontrol yine aday olarak yapılır — "güncellenen
 * kurulum" sayılıp bayat oturum korunmaz.
 */
export const INSTALL_PENDING_KEY = "tarodan.install.pending.v1";
/** AsyncStorage: anahtar zinciri öğeleri `SECURE_STORE_OPTIONS` ile yeniden yazıldı. */
export const KEYCHAIN_ACCESSIBILITY_MARKER_KEY = "tarodan.keychain.accessibility.v1";

/** Oturumla birlikte yaşayan anahtar zinciri öğeleri. */
const SESSION_SECURE_KEYS = [ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_SNAPSHOT_KEY] as const;

/** Bu hazırlığın kendi işaretleri — "kurulum kullanılmış mı" sayımına girmez. */
const OWN_MARKERS = new Set([INSTALL_MARKER_KEY, INSTALL_PENDING_KEY, KEYCHAIN_ACCESSIBILITY_MARKER_KEY]);

export interface MarkerStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  getAllKeys(): Promise<readonly string[]>;
}

/** Lazy: native modül yoksa (test / bozuk kurulum) hazırlık atlanır, açılış sürer. */
function loadAsyncStorage(): MarkerStorage | null {
  try {
    const mod = require("@react-native-async-storage/async-storage");
    return (mod?.default ?? mod) as MarkerStorage;
  } catch {
    return null;
  }
}

export type ReinstallCheck = "known-install" | "upgrade" | "wiped" | "unresolved" | "unknown";

/** Kurulum kontrolü çözüldü: işaret konur, "bekliyor" kaydı kalkar (sıra: önce işaret). */
async function markInstallResolved(storage: MarkerStorage): Promise<void> {
  await storage.setItem(INSTALL_MARKER_KEY, String(Date.now()));
  await storage.removeItem(INSTALL_PENDING_KEY).catch(() => undefined);
}

/**
 * Yeniden kurulumu saptar ve bayat oturumu siler. Sonuç:
 * `known-install` işaret var · `upgrade` işaretsiz ama kullanılmış kurulum (silinmez) ·
 * `wiped` yeni/yeniden kurulum, saklı oturum silindi (oturum kuşağı ilerler — eski oturumun
 * kuyruktaki yazımları düşer) · `unresolved` aday ama silinemedi ("bekliyor" kaydı kalır;
 * çağıran bu açılışta saklı oturumu yüklememeli) · `unknown` AsyncStorage okunamadı.
 */
export async function wipeSessionIfReinstalled(storage: MarkerStorage): Promise<ReinstallCheck> {
  let candidate: boolean;
  try {
    if (await storage.getItem(INSTALL_MARKER_KEY)) return "known-install";
    const pending = await storage.getItem(INSTALL_PENDING_KEY);
    const keys = await storage.getAllKeys();
    candidate = !!pending || !keys.some((key) => !OWN_MARKERS.has(key));
    if (!candidate) {
      await storage.setItem(INSTALL_MARKER_KEY, String(Date.now()));
      return "upgrade";
    }
  } catch (error) {
    logger.warn("Reinstall check failed", { err: safeError(error) });
    return "unknown";
  }
  try {
    // Önce "bekliyor": silme ya da işaret yazımı düşerse sonraki açılış yine aday sayar.
    await storage.setItem(INSTALL_PENDING_KEY, "1");
    await runTokenStorageExclusive(async () => {
      for (const key of SESSION_SECURE_KEYS) await SecureStore.deleteItemAsync(key);
    });
    advanceSessionEpoch();
  } catch (error) {
    logger.warn("Reinstall wipe failed", { err: safeError(error) });
    return "unresolved";
  }
  try {
    await markInstallResolved(storage);
  } catch (error) {
    // Silindi ama işaret yazılamadı: "bekliyor" kalır, sonraki açılış (boş) silmeyi tekrarlar.
    logger.warn("Install marker write failed", { err: safeError(error) });
  }
  return "wiped";
}

/** iOS: eski erişilebilirlikle yazılmış oturum öğelerini `SECURE_STORE_OPTIONS` ile yeniden yazar. */
export async function migrateKeychainAccessibility(storage: MarkerStorage): Promise<boolean> {
  try {
    if (await storage.getItem(KEYCHAIN_ACCESSIBILITY_MARKER_KEY)) return true;
    await runTokenStorageExclusive(async () => {
      for (const key of SESSION_SECURE_KEYS) {
        // Okunamazsa (kilitli) fırlatır → işaret konmaz, sonraki açılış yeniden dener.
        const value = await SecureStore.getItemAsync(key);
        if (value == null) continue;
        // Güncelleme erişilebilirliği değiştirmez: önce sil, sonra yeni seçenekle ekle.
        await SecureStore.deleteItemAsync(key);
        try {
          await SecureStore.setItemAsync(key, value, SECURE_STORE_OPTIONS);
        } catch (error) {
          // Yeni seçenekle yazılamadı: değeri eski hâliyle geri koy (oturum kaybolmasın).
          await SecureStore.setItemAsync(key, value).catch(() => undefined);
          throw error;
        }
      }
    });
    await storage.setItem(KEYCHAIN_ACCESSIBILITY_MARKER_KEY, String(Date.now()));
    return true;
  } catch (error) {
    logger.warn("Keychain accessibility migration failed", { err: safeError(error) });
    return false;
  }
}

/**
 * Açılış hazırlığı: yeniden kurulum temizliği + (iOS) erişilebilirlik göçü. Fırlatmaz.
 * Token okumaları (`loadToken`, istek interceptor'ı, refresh) bu bitene kadar bekler
 * (`setTokenStorageReadyGate`). Kontrol çözülemezse (aday ama silinemedi) bu açılışta saklı
 * oturum yok sayılır; kullanıcı giriş yapıp yeni çift yazılınca kontrol çözüldü sayılır.
 */
export function prepareSecureSession(): Promise<void> {
  const run = (async () => {
    const storage = loadAsyncStorage();
    if (!storage) return;
    const check = await wipeSessionIfReinstalled(storage);
    if (check === "unresolved") {
      suppressStoredSession(() => {
        void markInstallResolved(storage).catch(() => undefined);
      });
      return;
    }
    if (Platform.OS === "ios") await migrateKeychainAccessibility(storage);
  })().catch((error) => {
    logger.warn("Secure session setup failed", { err: safeError(error) });
  });
  setTokenStorageReadyGate(run);
  return run;
}
