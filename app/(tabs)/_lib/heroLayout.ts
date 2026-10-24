import { tabletSidePadding, theme, windowClassOf } from '@/ui';
import { HOME_GUTTER } from './homeLayout';

const { spacing } = theme;

/**
 * Hero layout: the reserved height and the real slider come from the SAME constants. Space is only
 * reserved when the hero was shown on the last launch and the answer has not arrived yet
 * (`useLastHadSlides`); with the hero off nothing is reserved.
 *
 * Phones (`compact`): border + image (width / 16:10) + body (at least `HERO_BODY_MIN_HEIGHT`) +
 * dots strip. The body has a minimum height, so typical slides match the reserved space exactly;
 * longer text only grows the body.
 *
 * Tablets / unfolded foldables (`medium` and up, like web `md`): the image (4:3, at most
 * `HERO_SPLIT_IMAGE_MAX_WIDTH`) sits beside the text (`imageSide`); height = border +
 * max(image, body minimum) + dots strip, so the hero no longer fills half the screen.
 */

/** Hero image ratio, same as web on phones (16/10). */
export const HERO_IMAGE_RATIO = 16 / 10;
/** Side-by-side (tablet) image ratio, web `md:aspect-[4/3]`. */
export const HERO_SPLIT_IMAGE_RATIO = 4 / 3;
/** Widest side-by-side image (pt; below web's 560px `sizes`, 360 pt tall). */
export const HERO_SPLIT_IMAGE_MAX_WIDTH = 480;
/** Shell border (each side). */
export const HERO_BORDER_WIDTH = 1;
/** Shell side margin on phones (each side; the same edge as the home sections). */
export const HERO_MARGIN_X = HOME_GUTTER;

/** Shell side margin for a window: `HERO_MARGIN_X` widened to the tablet page gutter. */
export function heroMarginX(screenWidth: number): number {
  return tabletSidePadding(HERO_MARGIN_X, screenWidth) as number;
}
/** Body minimum height: padding + title + subtitle + room for one or two buttons. */
export const HERO_BODY_MIN_HEIGHT = 168;
/** Dots strip: dot (8) + bottom padding. Reserved for a single slide too (no shift). */
export const HERO_DOTS_HEIGHT = 8 + spacing[3];

/** Is the image beside the text (window `medium` and up)? On phones it is on top. */
export function isHeroSplit(windowWidth: number): boolean {
  return windowClassOf(windowWidth) !== 'compact';
}

/** Inner (slide page) width of the shell: screen - side margins - borders. */
export function heroInnerWidth(screenWidth: number): number {
  return Math.max(0, screenWidth - 2 * heroMarginX(screenWidth) - 2 * HERO_BORDER_WIDTH);
}

/** Image box: the full page width on phones (16:10); half the page side by side (4:3, capped). */
export function heroImageSize(innerWidth: number, split: boolean): { width: number; height: number } {
  if (!split) return { width: innerWidth, height: innerWidth / HERO_IMAGE_RATIO };
  const width = Math.min(innerWidth / 2, HERO_SPLIT_IMAGE_MAX_WIDTH);
  return { width, height: width / HERO_SPLIT_IMAGE_RATIO };
}

/** Total shell height for a screen width (the reserved space). */
export function heroReservedHeight(screenWidth: number): number {
  const split = isHeroSplit(screenWidth);
  const image = heroImageSize(heroInnerWidth(screenWidth), split);
  const content = split ? Math.max(image.height, HERO_BODY_MIN_HEIGHT) : image.height + HERO_BODY_MIN_HEIGHT;
  return 2 * HERO_BORDER_WIDTH + content + HERO_DOTS_HEIGHT;
}
