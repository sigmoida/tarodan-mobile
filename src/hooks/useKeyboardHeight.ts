import { useEffect, useState } from 'react';
import { Keyboard, Platform, type KeyboardEvent } from 'react-native';

/**
 * Açık klavyenin yüksekliği (kapalıyken 0). iOS'ta `will*` olayları (klavye
 * animasyonuyla aynı anda), Android'de yalnız `did*` olayları var.
 *
 * Değerin anlamı platforma göre farklı (RN'in kendi ölçümü):
 * - iOS: ekranın altından ölçülür; ana ekran çubuğu alanını İÇERİR.
 * - Android: gezinti çubuğu HARİÇ (`ime.bottom - systemBars.bottom`,
 *   `ReactRootView.checkForKeyboardEvents`).
 * Alt boşluğu hesaplamak için `keyboardBottomInset` kullan.
 */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const ios = Platform.OS === 'ios';
    const onShow = (e: KeyboardEvent) => setHeight(e.endCoordinates?.height ?? 0);
    const onHide = () => setHeight(0);
    const subs = [
      Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', onShow),
      Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', onHide),
    ];
    return () => subs.forEach((s) => s.remove());
  }, []);
  return height;
}

/**
 * Tam ekran bir yüzeyin alt boşluğu: klavye kapalıyken güvenli alan, açıkken
 * klavyenin üst kenarı (alt düğmeler klavyenin üstünde kalsın).
 */
export function keyboardBottomInset(keyboardHeight: number, safeBottom: number): number {
  if (keyboardHeight <= 0) return safeBottom;
  return Platform.OS === 'ios'
    ? Math.max(keyboardHeight, safeBottom)
    : keyboardHeight + safeBottom;
}
