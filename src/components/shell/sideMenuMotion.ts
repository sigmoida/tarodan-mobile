/**
 * Yan menü ("push" çekmece) geometri ve jest kuralları — saf fonksiyonlar. `SideMenuHost` bunları
 * UI thread'inde (worklet) da çağırır, bu yüzden hepsi `'worklet'` işaretli ve yan etkisizdir.
 */

/** Menü genişliği: ekranın %80'i, en fazla 340pt (tablet/geniş telefonda). */
export const SIDE_MENU_WIDTH_RATIO = 0.8;
export const SIDE_MENU_MAX_WIDTH = 340;

/** Kayan içeriğin üstündeki soluklaştırma (beyaz) en çok bu opaklığa çıkar (%45). */
export const CONTENT_FADE_MAX_OPACITY = 0.45;

/** Sola sürüklemede menü, genişliğin bu kadarından fazla kapanmışsa (ya da hızlıysa) kapanır. */
export const CLOSE_DRAG_FRACTION = 0.3;
/** pt/sn — bu hızdan hızlı sola fırlatma menüyü kapatır. */
export const CLOSE_FLING_VELOCITY = 600;

export function sideMenuWidth(windowWidth: number): number {
  'worklet';
  return Math.min(Math.round(windowWidth * SIDE_MENU_WIDTH_RATIO), SIDE_MENU_MAX_WIDTH);
}

/**
 * Uygulama içeriğinin VE panelin (aynı kayan taşıyıcı) yatay kayması: 0 = kapalı, `width` = açık.
 * İçerik ile panel hiç ayrışmaz — tek değer.
 */
export function contentTranslateX(progress: number, width: number): number {
  'worklet';
  return progress * width;
}

/** Kayan içeriğin üstündeki beyaz soluklaştırmanın opaklığı (kapalıyken 0). */
export function contentFadeOpacity(progress: number): number {
  'worklet';
  return progress * CONTENT_FADE_MAX_OPACITY;
}

/** Sola sürükleme (`translationX` ≤ 0) → yeni progress; 0..1 aralığına kenetlenir. */
export function dragProgress(translationX: number, width: number): number {
  'worklet';
  return Math.min(1, Math.max(0, 1 + translationX / width));
}

/** Sürükleme bitince menü kapanmalı mı (yeterince uzağa çekildi ya da hızlı fırlatıldı)? */
export function shouldCloseOnRelease(translationX: number, velocityX: number, width: number): boolean {
  'worklet';
  return translationX < -width * CLOSE_DRAG_FRACTION || velocityX < -CLOSE_FLING_VELOCITY;
}
