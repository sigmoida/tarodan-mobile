import * as SecureStore from 'expo-secure-store';
import { SECURE_STORE_OPTIONS } from '@/lib/api/tokenStorage';

/**
 * Kurulum başına SABİT, rastgele kimlik — push kaydında `deviceId` olarak gider.
 *
 * Eskiden `deviceId` alanına cihaz MODELİ ("iPhone 15") yazılıyordu: aynı modeldeki
 * cihazlar ayırt edilemiyordu. Donanım kimliği (IDFV/ANDROID_ID) yerine kuruluma özgü
 * rastgele bir değer: kullanıcıyı uygulamalar arası izlemeye yaramaz, yeniden kurulumda
 * yenilenir. Anahtar zinciri öğesi `THIS_DEVICE_ONLY` — yedekten başka cihaza taşınmaz.
 */
export const INSTALL_ID_KEY = 'tarodan.installId.v1';

let cached: Promise<string> | null = null;

/** RFC 4122 v4 biçimi (kriptografik olmayan; yalnız ayırt edici kimlik). */
export function randomInstallId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function loadOrCreate(): Promise<string> {
  try {
    const existing = await SecureStore.getItemAsync(INSTALL_ID_KEY, SECURE_STORE_OPTIONS);
    if (existing) return existing;
  } catch {
    // Okunamadıysa yeni üretilir; yazım da başarısızsa bu oturumda bellekte kalır.
  }
  const id = randomInstallId();
  try {
    await SecureStore.setItemAsync(INSTALL_ID_KEY, id, SECURE_STORE_OPTIONS);
  } catch {
    /* en iyi çaba */
  }
  return id;
}

/** Kurulum kimliği (ilk çağrıda üretilir ve saklanır). Fırlatmaz. */
export function getInstallId(): Promise<string> {
  if (!cached) cached = loadOrCreate();
  return cached;
}

/** Bellek önbelleğini bırakır (yeniden kurulum silmesi + testler). */
export function resetInstallIdCache(): void {
  cached = null;
}
