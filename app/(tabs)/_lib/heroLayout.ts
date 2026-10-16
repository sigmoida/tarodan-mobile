import { theme } from '@/ui';
import { HOME_GUTTER } from './homeLayout';

const { spacing } = theme;

/**
 * Hero yerleşimi sabitleri. Yükseklik = kenarlık + görsel (genişlik / oran) +
 * gövde (en az `HERO_BODY_MIN_HEIGHT`) + nokta şeridi. Yer ayrılmaz: hero yokken
 * (yükleniyor / boş liste) hiçbir şey çizilmez.
 */

/** Hero görsel oranı — web mobil görünümüyle aynı (16/10). */
export const HERO_IMAGE_RATIO = 16 / 10;
/** Kabuk kenarlığı (her kenar). */
export const HERO_BORDER_WIDTH = 1;
/** Kabuğun yatay dış boşluğu (her kenar; ana sayfa bölümleriyle aynı kenar) — ekran genişliğinden düşülür. */
export const HERO_MARGIN_X = HOME_GUTTER;
/** Gövde taban yüksekliği: dolgu + başlık + alt başlık + bir/iki buton için tipik alan. */
export const HERO_BODY_MIN_HEIGHT = 168;
/** Nokta şeridi: nokta (8) + alt dolgu. Tek slaytta da ayrılır (slayt sayısı değişince yükseklik oynamasın). */
export const HERO_DOTS_HEIGHT = 8 + spacing[3];
