import { theme, windowClassOf } from '@/ui';
import { HOME_GUTTER } from './homeLayout';

const { spacing } = theme;

/**
 * Hero yerleşimi — ayrılan yükseklik ile gerçek slider AYNI sabitlerden çıkar.
 * Yer yalnız son açılışta hero görünmüşse ve cevap henüz gelmemişse tutulur
 * (`useLastHadSlides`); hero'su kapalıysa hiçbir şey ayrılmaz.
 *
 * Telefon (`compact`): kenarlık + görsel (genişlik / 16:10) + gövde (en az
 * `HERO_BODY_MIN_HEIGHT`) + nokta şeridi. Gövdeye taban yükseklik verildiği için
 * tipik slaytlar rezerve alanla birebir tutar; daha uzun metin yalnız gövdeyi büyütür.
 *
 * Tablet / açık katlanabilir (`medium` ve üstü, web `md` gibi): görsel (4:3, en çok
 * `HERO_SPLIT_IMAGE_MAX_WIDTH`) metnin yanında (`imageSide`); yükseklik = kenarlık +
 * max(görsel, gövde tabanı) + nokta şeridi. Böylece hero ekranın yarısını kaplamaz.
 */

/** Hero görsel oranı — web mobil görünümüyle aynı (16/10). */
export const HERO_IMAGE_RATIO = 16 / 10;
/** Yan yana (tablet) görsel oranı — web `md:aspect-[4/3]`. */
export const HERO_SPLIT_IMAGE_RATIO = 4 / 3;
/** Yan yana görselin en geniş hali (pt; web `sizes` 560px'in altında, yükseklik 360). */
export const HERO_SPLIT_IMAGE_MAX_WIDTH = 480;
/** Kabuk kenarlığı (her kenar). */
export const HERO_BORDER_WIDTH = 1;
/** Kabuğun yatay dış boşluğu (her kenar; ana sayfa bölümleriyle aynı kenar) — ekran genişliğinden düşülür. */
export const HERO_MARGIN_X = HOME_GUTTER;
/** Gövde taban yüksekliği: dolgu + başlık + alt başlık + bir/iki buton için tipik alan. */
export const HERO_BODY_MIN_HEIGHT = 168;
/** Nokta şeridi: nokta (8) + alt dolgu. Tek slaytta da ayrılır (kayma olmasın). */
export const HERO_DOTS_HEIGHT = 8 + spacing[3];

/** Görsel metnin yanında mı (pencere `medium` ve üstü)? Telefonda görsel üstte. */
export function isHeroSplit(windowWidth: number): boolean {
  return windowClassOf(windowWidth) !== 'compact';
}

/** Kabuğun iç (slayt sayfası) genişliği: ekran - yan boşluklar - kenarlıklar. */
export function heroInnerWidth(screenWidth: number): number {
  return Math.max(0, screenWidth - 2 * HERO_MARGIN_X - 2 * HERO_BORDER_WIDTH);
}

/** Görsel kutusu: telefonda tam sayfa genişliği (16:10), yan yanada sayfanın yarısı (4:3, sınırlı). */
export function heroImageSize(innerWidth: number, split: boolean): { width: number; height: number } {
  if (!split) return { width: innerWidth, height: innerWidth / HERO_IMAGE_RATIO };
  const width = Math.min(innerWidth / 2, HERO_SPLIT_IMAGE_MAX_WIDTH);
  return { width, height: width / HERO_SPLIT_IMAGE_RATIO };
}

/** Ekran genişliğinden kabuğun toplam yüksekliği (rezerve alan için). */
export function heroReservedHeight(screenWidth: number): number {
  const split = isHeroSplit(screenWidth);
  const image = heroImageSize(heroInnerWidth(screenWidth), split);
  const content = split ? Math.max(image.height, HERO_BODY_MIN_HEIGHT) : image.height + HERO_BODY_MIN_HEIGHT;
  return 2 * HERO_BORDER_WIDTH + content + HERO_DOTS_HEIGHT;
}
