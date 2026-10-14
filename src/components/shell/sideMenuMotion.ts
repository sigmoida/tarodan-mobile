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
 * bozulmaz. Hamburger her iki platformda da ana yol olarak kalır.
 */
export const SIDE_MENU_EDGE_WIDTH_IOS = 20;
/**
 * Android: sayfa kenar boşluğundan (16pt) başlayan yatay kaydırıcılarla (ana sayfa rayları, hero)
 * çakışmasın diye şerit kenar boşluğu kadar. Jest gezintisinde bu bölgeyi sistem "geri" jesti alır;
 * orada ana yol hamburger (3 düğmeli gezintide şerit çalışır).
 */
export const SIDE_MENU_EDGE_WIDTH_ANDROID = 16;

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

/** Navigasyon durumu (React Navigation) — yalnız okunan alanlar. */
export interface NavStateLike {
  index?: number;
  routes?: Array<{ name: string; state?: NavStateLike }>;
}

/**
 * Kenardan açma koşulu: `(tabs)` grubunu barındıran (kök) yığın EN ALTTAKİ `(tabs)`'ta duruyor —
 * yığın indeksi 0 ve o rota `(tabs)`. Üste itilmiş ikinci bir `(tabs)` kopyası (indeks > 0) ya da bir
 * yığın ekranı odaktayken `false` (orada sol kenar geri jestine ait). Durum yoksa `false`. Saf.
 */
export function isBaseTabsFocused(state: NavStateLike | undefined | null): boolean {
  let s = state ?? undefined;
  for (let depth = 0; s && depth < 8; depth += 1) {
    const routes = s.routes ?? [];
    if (routes.some((r) => r.name === '(tabs)')) {
      return (s.index ?? 0) === 0 && routes[0]?.name === '(tabs)';
    }
    s = routes[s.index ?? 0]?.state;
  }
  return false;
}
