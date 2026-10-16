/** Hero'nun en az bu oranı görünür alandaysa "ekranda" sayılır (web: %50 kesişim). */
export const HERO_VISIBLE_RATIO = 0.5;

export interface HeroViewMetrics {
  /** ScrollView'in kaydırma ofseti (üstten). */
  scrollY: number;
  /** ScrollView'in görünür yüksekliği. */
  viewportHeight: number;
  /** Hero'nun içerik koordinatında üst kenarı ve yüksekliği (onLayout). */
  top: number;
  height: number;
}

/**
 * Hero görünür alanda mı? Ölçüm henüz yoksa (yerleşim gelmedi) ya da hero yoksa (yükseklik 0) `true` — ilk
 * boyamada gösterim/ilerleme gereksiz yere kapalı başlamasın. Saf fonksiyon.
 */
export function isHeroInView(m: HeroViewMetrics): boolean {
  if (!(m.height > 0) || !(m.viewportHeight > 0)) return true;
  const visibleTop = Math.max(m.top, m.scrollY);
  const visibleBottom = Math.min(m.top + m.height, m.scrollY + m.viewportHeight);
  return visibleBottom - visibleTop >= m.height * HERO_VISIBLE_RATIO;
}
