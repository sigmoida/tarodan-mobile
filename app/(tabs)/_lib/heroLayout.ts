import { pageGutter, theme, windowClassOf } from '@/ui';

const { spacing, mediaRatios } = theme;

/**
 * Hero layout: the reserved height and the real slider come from the SAME constants. Space is only
 * reserved when the hero was shown on the last launch and the answer has not arrived yet
 * (`useLastHadSlides`); with the hero off nothing is reserved.
 *
 * Phones (`compact`): border + image (width / `HERO_IMAGE_RATIO`) + body (at least `HERO_BODY_MIN_HEIGHT`) +
 * dots strip. The body has a minimum height, so typical slides match the reserved space exactly;
 * longer text only grows the body.
 *
 * Tablets / unfolded foldables (`medium` and up, like web `md`): the image (`HERO_SPLIT_IMAGE_RATIO`, at
 * most `HERO_SPLIT_IMAGE_MAX_WIDTH`) sits beside the text (`imageSide`); height = border +
 * max(image, body minimum) + dots strip, so the hero no longer fills half the screen.
 */

/** Hero image ratio on phones (`compact`): the `heroCompact` media token, shared with web and admin. */
export const HERO_IMAGE_RATIO = mediaRatios.heroCompact.width / mediaRatios.heroCompact.height;
/** Side-by-side (tablet) image ratio: the `heroSplit` media token, web `md:aspect-hero-split`. */
export const HERO_SPLIT_IMAGE_RATIO = mediaRatios.heroSplit.width / mediaRatios.heroSplit.height;
/** Widest side-by-side image (pt; below web's 560px `sizes`). */
export const HERO_SPLIT_IMAGE_MAX_WIDTH = 480;
/** Shell border (each side). */
export const HERO_BORDER_WIDTH = 1;
/** Shell side margin for a window (each side): the page gutter, the same edge as the home sections. */
export function heroMarginX(screenWidth: number): number {
  return pageGutter(screenWidth);
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

/** Image box: the full page width on phones (`HERO_IMAGE_RATIO`); half the page side by side
 * (`HERO_SPLIT_IMAGE_RATIO`, capped). */
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
