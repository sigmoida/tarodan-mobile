import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  SECURE_STORE_OPTIONS,
  runTokenStorageExclusive,
} from "@/lib/api/tokenStorage";
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
/** AsyncStorage: anahtar zinciri öğeleri `SECURE_STORE_OPTIONS` ile yeniden yazıldı. */
export const KEYCHAIN_ACCESSIBILITY_MARKER_KEY = "tarodan.keychain.accessibility.v1";

/** Oturumla birlikte yaşayan anahtar zinciri öğeleri. */
const SESSION_SECURE_KEYS = [ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_SNAPSHOT_KEY] as const;

/** Bu hazırlığın kendi işaretleri — "kurulum kullanılmış mı" sayımına girmez. */
const OWN_MARKERS = new Set([INSTALL_MARKER_KEY, KEYCHAIN_ACCESSIBILITY_MARKER_KEY]);

export interface MarkerStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
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

export type ReinstallCheck = "known-install" | "upgrade" | "wiped" | "unknown";

/**
 * Yeniden kurulumu saptar ve bayat oturumu siler. Sonuç:
 * `known-install` işaret var · `upgrade` işaretsiz ama kullanılmış kurulum (silinmez) ·
 * `wiped` yeni/yeniden kurulum, saklı oturum silindi · `unknown` karar verilemedi (işaret konmadı).
 */
export async function wipeSessionIfReinstalled(storage: MarkerStorage): Promise<ReinstallCheck> {
  try {
    if (await storage.getItem(INSTALL_MARKER_KEY)) return "known-install";
    const keys = await storage.getAllKeys();
    const usedInstall = keys.some((key) => !OWN_MARKERS.has(key));
    if (!usedInstall) {
      await runTokenStorageExclusive(async () => {
        for (const key of SESSION_SECURE_KEYS) await SecureStore.deleteItemAsync(key);
      });
    }
    await storage.setItem(INSTALL_MARKER_KEY, String(Date.now()));
    return usedInstall ? "upgrade" : "wiped";
  } catch (error) {
    logger.warn("Reinstall check failed", { err: safeError(error) });
    return "unknown";
  }
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

/** Açılış hazırlığı: yeniden kurulum temizliği + (iOS) erişilebilirlik göçü. Fırlatmaz. */
export async function prepareSecureSession(): Promise<void> {
  const storage = loadAsyncStorage();
  if (!storage) return;
  await wipeSessionIfReinstalled(storage);
  if (Platform.OS === "ios") await migrateKeychainAccessibility(storage);
}
