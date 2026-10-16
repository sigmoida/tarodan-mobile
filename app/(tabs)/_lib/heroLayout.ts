import { theme } from '@/ui';
import { HOME_GUTTER } from './homeLayout';

const { spacing } = theme;

/**
 * Hero yerleşimi — ayrılan yükseklik ile gerçek slider AYNI sabitlerden çıkar.
 * Yer yalnız son açılışta hero görünmüşse ve cevap henüz gelmemişse tutulur
 * (`useLastHadSlides`); hero'su kapalıysa hiçbir şey ayrılmaz.
 *
 * Gerçek yükseklik = kenarlık + görsel (genişlik / oran) + gövde (en az
 * `HERO_BODY_MIN_HEIGHT`) + nokta şeridi. Gövdeye taban yükseklik verildiği için
 * tipik slaytlar rezerve alanla birebir tutar; daha uzun metin yalnız gövdeyi büyütür.
 */

/** Hero görsel oranı — web mobil görünümüyle aynı (16/10). */
export const HERO_IMAGE_RATIO = 16 / 10;
/** Kabuk kenarlığı (her kenar). */
export const HERO_BORDER_WIDTH = 1;
/** Kabuğun yatay dış boşluğu (her kenar; ana sayfa bölümleriyle aynı kenar) — ekran genişliğinden düşülür. */
export const HERO_MARGIN_X = HOME_GUTTER;
/** Gövde taban yüksekliği: dolgu + başlık + alt başlık + bir/iki buton için tipik alan. */
export const HERO_BODY_MIN_HEIGHT = 168;
/** Nokta şeridi: nokta (8) + alt dolgu. Tek slaytta da ayrılır (kayma olmasın). */
export const HERO_DOTS_HEIGHT = 8 + spacing[3];

/** Ekran genişliğinden kabuğun toplam yüksekliği (rezerve alan için). */
export function heroReservedHeight(screenWidth: number): number {
  const inner = Math.max(0, screenWidth - 2 * HERO_MARGIN_X - 2 * HERO_BORDER_WIDTH);
  return 2 * HERO_BORDER_WIDTH + inner / HERO_IMAGE_RATIO + HERO_BODY_MIN_HEIGHT + HERO_DOTS_HEIGHT;
}
