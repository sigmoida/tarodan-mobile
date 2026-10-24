import { StyleSheet, type ViewStyle } from 'react-native';
import {
  HERO_BODY_MIN_HEIGHT,
  HERO_BORDER_WIDTH,
  HERO_DOTS_HEIGHT,
  HERO_IMAGE_RATIO,
  HERO_MARGIN_X,
  HERO_SPLIT_IMAGE_MAX_WIDTH,
  HERO_SPLIT_IMAGE_RATIO,
  heroImageSize,
  heroInnerWidth,
  heroReservedHeight,
  isHeroSplit,
} from '../heroLayout';
import { heroStyles } from '../heroStyles';
import { homeStyles } from '../homeStyles';
import { HOME_GUTTER, HOME_SECTION_GAP } from '../homeLayout';

describe('heroReservedHeight', () => {
  it('genişlikten hesaplanır: kenarlık + görsel (oran) + gövde tabanı + nokta şeridi', () => {
    const screen = 390;
    const inner = screen - 2 * HERO_MARGIN_X - 2 * HERO_BORDER_WIDTH;
    expect(heroReservedHeight(screen)).toBeCloseTo(
      2 * HERO_BORDER_WIDTH + inner / HERO_IMAGE_RATIO + HERO_BODY_MIN_HEIGHT + HERO_DOTS_HEIGHT,
      5,
    );
  });

  it('geniş ekranda daha yüksek, dar ekranda daha alçak', () => {
    expect(heroReservedHeight(430)).toBeGreaterThan(heroReservedHeight(360));
  });

  it('negatif/çok dar genişlikte taşmaz', () => {
    expect(heroReservedHeight(0)).toBeGreaterThan(0);
  });
});

describe('hero on large screens', () => {
  it('phones (and the foldable outer display) keep the stacked layout', () => {
    for (const w of [320, 390, 430, 466, 599]) expect(isHeroSplit(w)).toBe(false);
  });

  it('medium and wider windows put the image beside the text', () => {
    for (const w of [600, 626, 820, 1032, 1280]) expect(isHeroSplit(w)).toBe(true);
  });

  it.each([
    [626, 890],
    [820, 1180],
    [1032, 1376],
  ])('%d pt: half-width 4:3 image (capped), height well under half the window (%d)', (width, height) => {
    const inner = heroInnerWidth(width);
    const image = heroImageSize(inner, true);
    expect(image.width).toBe(Math.min(inner / 2, HERO_SPLIT_IMAGE_MAX_WIDTH));
    expect(image.height).toBeCloseTo(image.width / HERO_SPLIT_IMAGE_RATIO, 5);
    const reserved = heroReservedHeight(width);
    expect(reserved).toBeCloseTo(
      2 * HERO_BORDER_WIDTH + Math.max(image.height, HERO_BODY_MIN_HEIGHT) + HERO_DOTS_HEIGHT,
      5,
    );
    expect(reserved / height).toBeLessThan(0.33);
  });

  it('the split image never exceeds the cap (iPad 13", landscape tablets)', () => {
    expect(heroImageSize(heroInnerWidth(1032), true).width).toBe(HERO_SPLIT_IMAGE_MAX_WIDTH);
    expect(heroImageSize(heroInnerWidth(1280), true).height).toBe(HERO_SPLIT_IMAGE_MAX_WIDTH / HERO_SPLIT_IMAGE_RATIO);
  });

  it('stacked size = the phone formula', () => {
    expect(heroImageSize(358, false)).toEqual({ width: 358, height: 358 / HERO_IMAGE_RATIO });
  });
});

describe('hero sabitleri', () => {
  it('gerçek slider parçaları aynı sabitleri paylaşır', () => {
    expect(StyleSheet.flatten(heroStyles.image).aspectRatio).toBe(HERO_IMAGE_RATIO);
    expect(StyleSheet.flatten(heroStyles.body).minHeight).toBe(HERO_BODY_MIN_HEIGHT);
    expect(StyleSheet.flatten(heroStyles.dots).height).toBe(HERO_DOTS_HEIGHT);
    expect(StyleSheet.flatten(heroStyles.shell).borderWidth).toBe(HERO_BORDER_WIDTH);
    expect(StyleSheet.flatten(heroStyles.shell).marginHorizontal).toBe(HERO_MARGIN_X);
  });
});

describe('ana sayfa bölüm hizası (tek kaynak homeLayout)', () => {
  it('hero (slider / rezerve) üst bardan ayrılır ve bölümlerle aynı yan kenarda', () => {
    for (const st of [heroStyles.shell, heroStyles.reserved]) {
      const f: ViewStyle = StyleSheet.flatten(st);
      expect(f.marginTop).toBe(HOME_SECTION_GAP);
      expect(f.marginHorizontal).toBe(HOME_GUTTER);
      expect(f.marginBottom).toBeUndefined();
    }
    expect(HERO_MARGIN_X).toBe(HOME_GUTTER);
  });

  it('bölümler (üretici şeridi, kartlar) aynı kenar ve aynı aralık', () => {
    const s = StyleSheet.flatten(homeStyles.sections);
    expect(s.paddingHorizontal).toBe(HOME_GUTTER);
    expect(s.paddingVertical).toBe(HOME_SECTION_GAP);
    expect(s.gap).toBe(HOME_SECTION_GAP);
  });
});
