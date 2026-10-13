import AsyncStorage from '@react-native-async-storage/async-storage';

/** Popup afişi cihaz başına en fazla bu sıklıkta gösterilir (web: 24 saat). */
export const POPUP_AD_INTERVAL_MS = 24 * 60 * 60 * 1000;
export const POPUP_AD_STORAGE_KEY = 'tarodan.popupAd.shownAt';

/**
 * Popup şimdi gösterilebilir mi? Depolama okunamazsa hata "gösterme" demek
 * değildir (web ile aynı) — `true`. Saat geriye alınmışsa (damga gelecekte)
 * sonsuza dek kilitlenmemek için yine `true`.
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

/** Gösterim damgası. Yazılamazsa bu görünüm yine de gösterilmiş sayılır. */
export async function markPopupAdShown(now: number = Date.now()): Promise<void> {
  try {
    await AsyncStorage.setItem(POPUP_AD_STORAGE_KEY, String(now));
  } catch {
    // sonraki açılışta tekrar çıkabilir; sessizce geç
  }
}

/**
 * Gösterim damgasını geri alır: popup açıldıktan sonra gösterilmemesi gerektiği
 * anlaşılırsa (ör. üye sonradan reklamsız çıktı) kullanıcı 24 saat boyunca
 * görmediği bir popup için kilitlenmesin. Silinemezse sessizce geçer.
 */
export async function clearPopupAdShown(): Promise<void> {
  try {
    await AsyncStorage.removeItem(POPUP_AD_STORAGE_KEY);
  } catch {
    // yazılmış damga kalırsa en kötü 24 saat popup çıkmaz; sessizce geç
  }
}
