/**
 * Üst çubukların (arama + filtre) kaydırmaya bağlı gizlenme kuralı. Reanimated scroll handler'ı
 * UI thread'inde çalıştırdığı için fonksiyonlar `'worklet'`; saf olduklarından jest'te doğrudan
 * test edilir (bkz. __tests__/searchCollapse.test.tsx).
 */

/** Bu offset'in altında çubuklar her koşulda görünür. */
export const BARS_TOP_EPSILON = 4;
/** Yön algısı için gereken en az kaydırma farkı (pt). */
export const BARS_SCROLL_DELTA = 6;
/** Bu offset'in altına inince "en üste dön" düğmesi görünür. */
export const SCROLL_TOP_THRESHOLD = 600;
/** Gizle/göster animasyonu süresi (ms). */
export const BARS_ANIM_MS = 220;

export function nextBarsHidden(
  y: number,
  prevY: number,
  hidden: boolean,
  measured: boolean,
  headerHeight: number,
): boolean {
  'worklet';
  if (y <= BARS_TOP_EPSILON) return false;
  if (y - prevY > BARS_SCROLL_DELTA && !hidden && measured && y > headerHeight) return true;
  if (prevY - y > BARS_SCROLL_DELTA && hidden) return false;
  return hidden;
}

export function shouldShowScrollTop(y: number): boolean {
  'worklet';
  return y > SCROLL_TOP_THRESHOLD;
}
