import { StyleSheet, type ViewStyle } from 'react-native';
import {
  HERO_BODY_MIN_HEIGHT,
  HERO_BORDER_WIDTH,
  HERO_DOTS_HEIGHT,
  HERO_IMAGE_RATIO,
  HERO_MARGIN_X,
  heroReservedHeight,
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

  it('gerçek slider parçalarıyla aynı sabitleri paylaşır (kayma olmasın)', () => {
    expect(StyleSheet.flatten(heroStyles.image).aspectRatio).toBe(HERO_IMAGE_RATIO);
    expect(StyleSheet.flatten(heroStyles.body).minHeight).toBe(HERO_BODY_MIN_HEIGHT);
    expect(StyleSheet.flatten(heroStyles.dots).height).toBe(HERO_DOTS_HEIGHT);
    expect(StyleSheet.flatten(heroStyles.shell).borderWidth).toBe(HERO_BORDER_WIDTH);
    expect(StyleSheet.flatten(heroStyles.shell).marginHorizontal).toBe(HERO_MARGIN_X);
  });

  it('negatif/çok dar genişlikte taşmaz', () => {
    expect(heroReservedHeight(0)).toBeGreaterThan(0);
  });
});

describe('ana sayfa bölüm hizası (tek kaynak homeLayout)', () => {
  it('hero (slider / rezerve / yedek) üst bardan ayrılır ve bölümlerle aynı yan kenarda', () => {
    for (const st of [heroStyles.shell, heroStyles.reserved, homeStyles.heroBanner]) {
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
