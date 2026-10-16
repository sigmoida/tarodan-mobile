import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ActiveAd, PopupFrequency } from '@/lib/api';

/**
 * Popup sıklığı reklam başınadır (global 24 saat damgası yok):
 * - `until_dismissed`: kullanıcı KAPATINCA `tarodan.popupAd.dismissed.<id>:<popupVersion>`
 *   yazılır; anahtar varken o reklam gösterilmez. Sürüm artınca anahtar değişir → yeniden çıkar.
 * - `every_visit`: hiçbir şey yazılmaz/okunmaz; her ana sayfa ziyaretinde yeniden değerlendirilir.
 * Eski API alanları yoksa: `until_dismissed` + sürüm `1`.
 */
export const POPUP_AD_DISMISSED_PREFIX = 'tarodan.popupAd.dismissed.';

type PopupAdFields = Pick<ActiveAd, 'id' | 'popupFrequency' | 'popupVersion'>;

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
 * Kapatılmış (`until_dismissed` + anahtar var) reklamları eler; `pickAd`'den ÖNCE çağrılır.
 * Depolama okunamazsa hata "gösterme" demek değildir — reklam elenmez.
 */
export async function filterDismissedPopupAds<T extends PopupAdFields>(ads: readonly T[]): Promise<T[]> {
  const checks = await Promise.all(
    ads.map(async (ad) => {
      if (popupFrequencyOf(ad) === 'every_visit') return true;
      try {
        return (await AsyncStorage.getItem(popupDismissKey(ad))) == null;
      } catch {
        return true;
      }
    }),
  );
  return ads.filter((_, i) => checks[i]);
}

/**
 * Kullanıcı popup'ı kapattı: `until_dismissed` ise anahtarı yazar; `every_visit` hiçbir şey
 * yazmaz. Yazılamazsa sessizce geçer (bir sonraki ziyarette yeniden çıkabilir).
 */
export async function markPopupAdDismissed(ad: PopupAdFields, now: number = Date.now()): Promise<void> {
  if (popupFrequencyOf(ad) === 'every_visit') return;
  try {
    await AsyncStorage.setItem(popupDismissKey(ad), String(now));
  } catch {
    // sessizce geç
  }
}
