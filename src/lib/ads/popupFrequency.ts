import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ActiveAd, PopupFrequency } from '@/lib/api';

/**
 * Popup sıklığı — iki yol, yanıta göre seçilir (`isLegacyPopupResponse`):
 *
 * **Yeni API** (reklamlarda `popupFrequency`/`popupVersion` var) — reklam başına:
 * - `until_dismissed`: kullanıcı KAPATINCA `tarodan.popupAd.dismissed.<id>:<popupVersion>`
 *   yazılır (ve oturum belleğine alınır); anahtar varken o reklam gösterilmez. Sürüm artınca
 *   anahtar değişir → yeniden çıkar.
 * - `every_visit`: hiçbir şey yazılmaz/okunmaz; her ana sayfa ziyaretinde yeniden değerlendirilir.
 * - İlk geçişte eski global damga (`POPUP_AD_STORAGE_KEY`) bir kez silinir.
 *
 * **Eski API** (alanlar yok; API henüz yayında değil): eski davranış — cihaz başına tek global
 * 24 saatlik damga, gösterim anında yazılır.
 */

// ── Eski yol: global 24 saat damgası ────────────────────────────────────────

/** Eski API: popup cihaz başına en fazla bu sıklıkta gösterilir (web: 24 saat). */
export const POPUP_AD_INTERVAL_MS = 24 * 60 * 60 * 1000;
export const POPUP_AD_STORAGE_KEY = 'tarodan.popupAd.shownAt';

type PopupAdFields = Pick<ActiveAd, 'id' | 'popupFrequency' | 'popupVersion'>;

/** Yanıt eski API'den mi (hiçbir popup reklamında sıklık/sürüm alanı yok)? */
export function isLegacyPopupResponse(ads: readonly Pick<ActiveAd, 'popupFrequency' | 'popupVersion'>[]): boolean {
  return !ads.some((ad) => ad.popupFrequency != null || ad.popupVersion != null);
}

/**
 * Eski yol: popup şimdi gösterilebilir mi? Depolama okunamazsa hata "gösterme" demek
 * değildir — `true`. Saat geriye alınmışsa (damga gelecekte) sonsuza dek kilitlenmemek için `true`.
 */
export async function canShowPopupAd(now: number = Date.now()): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(POPUP_AD_STORAGE_KEY);
    if (!raw) return true;
    const shownAt = Number(raw);
    if (!Number.isFinite(shownAt)) return true;
    if (shownAt > now) return true;
    return now - shownAt >= POPUP_AD_INTERVAL_MS;
  } catch {
    return true;
  }
}

/** Eski yol: gösterim damgası. Yazılamazsa bu görünüm yine de gösterilmiş sayılır. */
export async function markPopupAdShown(now: number = Date.now()): Promise<void> {
  try {
    await AsyncStorage.setItem(POPUP_AD_STORAGE_KEY, String(now));
  } catch {
    // sonraki açılışta tekrar çıkabilir; sessizce geç
  }
}

/**
 * Eski yol: gösterim damgasını geri alır (popup açıldıktan sonra üye reklamsız çıktı) —
 * kullanıcı görmemesi gereken bir popup için 24 saat kilitlenmesin. Hata sessizce geçer.
 */
export async function clearPopupAdShown(): Promise<void> {
  try {
    await AsyncStorage.removeItem(POPUP_AD_STORAGE_KEY);
  } catch {
    // sessizce geç
  }
}

let legacyStampCleared = false;

/** Yeni yola ilk geçişte eski global damgayı süreç başına BİR kez siler. */
export async function clearLegacyPopupStampOnce(): Promise<void> {
  if (legacyStampCleared) return;
  legacyStampCleared = true;
  await clearPopupAdShown();
}

// ── Yeni yol: reklam başına kapatma ─────────────────────────────────────────

export const POPUP_AD_DISMISSED_PREFIX = 'tarodan.popupAd.dismissed.';

/**
 * Bu süreçte kapatılan anahtarlar (web `memoryDismissals` karşılığı): depo yazımı başarısız
 * olsa ya da ana sayfa yeniden bağlansa da aynı oturumda tekrar çıkmaz.
 */
const memoryDismissals = new Set<string>();

/** Yalnız testler: süreç belleğini sıfırlar. */
export function resetPopupFrequencyMemoryForTests(): void {
  memoryDismissals.clear();
  legacyStampCleared = false;
}

/** Sıklık; eksik/bilinmeyen değer `until_dismissed` (güvenli varsayılan). */
export function popupFrequencyOf(ad: Pick<ActiveAd, 'popupFrequency'>): PopupFrequency {
  return ad.popupFrequency === 'every_visit' ? 'every_visit' : 'until_dismissed';
}

/** İçerik sürümü; eksik/bozuk değer `1`. */
export function popupVersionOf(ad: Pick<ActiveAd, 'popupVersion'>): number {
  const v = ad.popupVersion;
  return typeof v === 'number' && Number.isFinite(v) ? v : 1;
}

/** Reklam + sürüm başına "kapatıldı" anahtarı. */
export function popupDismissKey(ad: PopupAdFields): string {
  return `${POPUP_AD_DISMISSED_PREFIX}${ad.id}:${popupVersionOf(ad)}`;
}

/**
 * Kapatılmış (`until_dismissed` + bellekte ya da depoda anahtar var) reklamları eler; `pickAd`'den
 * ÖNCE çağrılır. Depolama okunamazsa hata "gösterme" demek değildir — reklam elenmez.
 */
export async function filterDismissedPopupAds<T extends PopupAdFields>(ads: readonly T[]): Promise<T[]> {
  const checks = await Promise.all(
    ads.map(async (ad) => {
      if (popupFrequencyOf(ad) === 'every_visit') return true;
      const key = popupDismissKey(ad);
      if (memoryDismissals.has(key)) return false;
      try {
        return (await AsyncStorage.getItem(key)) == null;
      } catch {
        return true;
      }
    }),
  );
  return ads.filter((_, i) => checks[i]);
}

/**
 * Kullanıcı popup'ı kapattı: `until_dismissed` ise anahtar belleğe alınır ve depoya yazılır;
 * `every_visit` hiçbir şey yazmaz. Depoya yazılamazsa sessizce geçer (bellek bu oturumu korur).
 */
export async function markPopupAdDismissed(ad: PopupAdFields, now: number = Date.now()): Promise<void> {
  if (popupFrequencyOf(ad) === 'every_visit') return;
  const key = popupDismissKey(ad);
  memoryDismissals.add(key);
  try {
    await AsyncStorage.setItem(key, String(now));
  } catch {
    // sessizce geç
  }
}
