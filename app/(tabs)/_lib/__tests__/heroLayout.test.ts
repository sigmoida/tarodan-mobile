import { StyleSheet, type ViewStyle } from 'react-native';
import {
  HERO_BODY_MIN_HEIGHT,
  HERO_BORDER_WIDTH,
  HERO_DOTS_HEIGHT,
  HERO_IMAGE_RATIO,
  HERO_MARGIN_X,
} from '../heroLayout';
import { heroStyles } from '../heroStyles';
import { homeStyles } from '../homeStyles';
import { HOME_GUTTER, HOME_SECTION_GAP } from '../homeLayout';

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
  it('hero (slider) üst bardan ayrılır ve bölümlerle aynı yan kenarda', () => {
    const f: ViewStyle = StyleSheet.flatten(heroStyles.shell);
    expect(f.marginTop).toBe(HOME_SECTION_GAP);
    expect(f.marginHorizontal).toBe(HOME_GUTTER);
    expect(f.marginBottom).toBeUndefined();
    expect(HERO_MARGIN_X).toBe(HOME_GUTTER);
  });

  it('bölümler (üretici şeridi, kartlar) aynı kenar ve aynı aralık', () => {
    const s = StyleSheet.flatten(homeStyles.sections);
    expect(s.paddingHorizontal).toBe(HOME_GUTTER);
    expect(s.paddingVertical).toBe(HOME_SECTION_GAP);
    expect(s.gap).toBe(HOME_SECTION_GAP);
  });
});
