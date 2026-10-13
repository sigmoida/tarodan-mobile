/**
 * Alt menü daralma mantığı — SAF worklet fonksiyonları (UI thread'inde `useAnimatedScrollHandler`
 * içinden çağrılır; jest'te düz fonksiyon olarak test edilir). Durum yalnızca sayılardan oluşur.
 */

/** Yön değişiminden sonra durumun değişmesi için gereken kaydırma mesafesi (pt) — histerezis. */
export const TAB_BAR_SCROLL_THRESHOLD = 24;
/** Bu ofsetin altında (liste başı) menü HER ZAMAN açıktır. */
export const TAB_BAR_TOP_ZONE = 16;
/** İçerik bundan az kaydırılabiliyorsa daraltma yok (kısa sayfa). */
export const TAB_BAR_MIN_SCROLL_RANGE = TAB_BAR_SCROLL_THRESHOLD * 2;

export interface TabBarScrollState {
  /** Menü daraltılmış mı (hap gizli, "+" solda)? */
  collapsed: boolean;
  /** Mevcut yöndeki kaydırmanın başladığı ofset (son yön değişiminin ekstremumu). */
  anchor: number;
  /** Önceki (kıstırılmış) ofset. */
  lastY: number;
}

export const TAB_BAR_INITIAL_STATE: TabBarScrollState = { collapsed: false, anchor: 0, lastY: 0 };

/**
 * Bir kaydırma olayından sonraki durum.
 * - `y` [0, maxY] aralığına kıstırılır: üst bounce (pull-to-refresh) ve alt bounce yanlış yön üretmez.
 * - Liste başında (<= TOP_ZONE) ya da kısa içerikte: açık.
 * - Aksi halde yön değişince `anchor` sıfırlanır; anchor'dan >= eşik aşağı => daralt, >= eşik yukarı => aç.
 *   Eşik içindeki küçük salınımlar durumu değiştirmez (titreme yok).
 * `collapsed` girdisi çağıranın tuttuğu GERÇEK durumdur (sekme değişince dışarıdan sıfırlanabilir).
 */
export function reduceTabBarScroll(
  prev: TabBarScrollState,
  y: number,
  maxY: number,
): TabBarScrollState {
  'worklet';
  if (maxY < TAB_BAR_MIN_SCROLL_RANGE) return { collapsed: false, anchor: 0, lastY: 0 };
  const cy = Math.min(Math.max(y, 0), maxY);
  if (cy <= TAB_BAR_TOP_ZONE) return { collapsed: false, anchor: cy, lastY: cy };

  const dy = cy - prev.lastY;
  let anchor = prev.anchor;
  // Yön değişimi: önceki konum yeni yöndeki serinin başlangıcı olur.
  if ((dy > 0 && anchor > prev.lastY) || (dy < 0 && anchor < prev.lastY)) anchor = prev.lastY;

  const dist = cy - anchor;
  let collapsed = prev.collapsed;
  if (dist >= TAB_BAR_SCROLL_THRESHOLD) collapsed = true;
  else if (dist <= -TAB_BAR_SCROLL_THRESHOLD) collapsed = false;
  return { collapsed, anchor, lastY: cy };
}

/**
 * Ölçüm değişince (içerik boyu / görünür yükseklik) menü açılmalı mı? Kaydırma olayı gelmeyen
 * içerik değişimlerinde (öğe silinip liste ekrana sığınca, yeni ScrollView 0'dan başlayınca,
 * Android'de eksik olay) daraltılmış menünün kalıcı gizli kalmasını önler.
 * `offsetY`: son bilinen (kıstırılmış) kaydırma ofseti.
 */
export function shouldExpandOnMeasure(contentH: number, layoutH: number, offsetY: number): boolean {
  'worklet';
  return contentH - layoutH < TAB_BAR_MIN_SCROLL_RANGE || offsetY <= TAB_BAR_TOP_ZONE;
}

/**
 * Alt menü hapının gizlenme stili (`progress`: 0 açık, 1 daralmış) — SAF worklet.
 * - Fallback: opacity + küçük aşağı kayma + hafif küçülme.
 * - Cam (iOS 26 Liquid Glass): native cam, ata `opacity < 1` iken efektini kaybeder → opacity YOK;
 *   hap alt kenarın ötesine (`glassHideY`) kayar + küçülür. İçerik soluklaşması ayrı (`pillContentOpacity`).
 */
export function pillHideStyle(
  glass: boolean,
  progress: number,
  fallbackTranslateY: number,
  glassHideY: number,
  hideScale: number,
) {
  'worklet';
  const scale = 1 - progress * (1 - hideScale);
  if (glass) return { transform: [{ translateY: progress * glassHideY }, { scale }] };
  return { opacity: 1 - progress, transform: [{ translateY: progress * fallbackTranslateY }, { scale }] };
}

/** Cam hapın İÇERİĞİNİN opaklığı (cam yüzeyin kendisine opacity verilmez); fallback'te tam görünür. */
export function pillContentOpacity(glass: boolean, progress: number): number {
  'worklet';
  return glass ? 1 - progress : 1;
}

/**
 * Ham kaydırma ölçülerini `contentInset`'ten bağımsız (0 = içerik başı) ofset + aralığa çevirir.
 * iOS'ta `contentInset.top` (ana sayfanın yüzen üst barı) varken dinlenme ofseti `-inset`tir ve
 * `contentSize` inset'i içermez; Android'de aynı boşluk içerik `paddingTop`udur (zaten ofset 0'dan
 * başlar, contentSize'a dahil). Normalizasyonla iki platform da aynı eşiklere uyar.
 */
export function normalizeScrollMetrics(
  offsetY: number,
  contentH: number,
  layoutH: number,
  insetTop = 0,
  insetBottom = 0,
): { y: number; maxY: number } {
  'worklet';
  return { y: offsetY + insetTop, maxY: contentH + insetTop + insetBottom - layoutH };
}
