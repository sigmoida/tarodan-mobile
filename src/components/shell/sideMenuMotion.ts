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

/**
 * Kenardan açma şeridinin genişliği (pt): sürükleme yalnız ekranın sol kenarındaki bu şeritte
 * BAŞLARSA menüyü açar — yatay listeler/karuseller (sayfa kenar boşluğu 16pt'den başlar) ve dokunuşlar
 * bozulmaz. Android'de jest gezintisinin sistem "geri" bölgesi (~24dp) kenarı önce yakalar; şerit biraz
 * daha geniş tutulur ki o bölgenin hemen içinden başlayan sürükleme de menüyü açsın (3 düğmeli
 * gezintide tüm şerit çalışır). Hamburger her iki platformda da ana yol olarak kalır.
 */
export const SIDE_MENU_EDGE_WIDTH_IOS = 20;
export const SIDE_MENU_EDGE_WIDTH_ANDROID = 32;

export function sideMenuEdgeWidth(os: string): number {
  return os === 'android' ? SIDE_MENU_EDGE_WIDTH_ANDROID : SIDE_MENU_EDGE_WIDTH_IOS;
}

/** Kenardan açan sürükleme genişliğin bu kadarını geçtiyse (ya da sağa hızlıysa) menü açılır. */
export const OPEN_DRAG_FRACTION = 0.3;

/** Sağa sürükleme (`translationX` ≥ 0) → açılış progress'i; 0..1 aralığına kenetlenir. */
export function openDragProgress(translationX: number, width: number): number {
  'worklet';
  if (width <= 0) return 0;
  return Math.min(1, Math.max(0, translationX / width));
}

/** Kenardan sürükleme bitince menü açılmalı mı (yeterince çekildi ya da sağa hızlı fırlatıldı)? */
export function shouldOpenOnRelease(translationX: number, velocityX: number, width: number): boolean {
  'worklet';
  if (velocityX < -CLOSE_FLING_VELOCITY) return false;
  return translationX > width * OPEN_DRAG_FRACTION || velocityX > CLOSE_FLING_VELOCITY;
}
