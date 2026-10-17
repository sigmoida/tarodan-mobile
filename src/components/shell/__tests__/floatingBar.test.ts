/**
 * Ana sayfa yüzen üst bar yardımcıları: liste üst boşluğu (iOS contentInset / Android padding),
 * animasyon stilleri (arama yukarı + sola kayıp solar) ve inset normalizasyonu.
 */
import {
  SEARCH_HIDE_TRANSLATE_X,
  SEARCH_HIDE_TRANSLATE_Y,
  floatingBarScrollProps,
  searchContentOpacity,
  searchHideStyle,
} from '../floatingBar';
import { APP_SHELL_BAR_HEIGHT } from '../tabBarLayout';
import { TAB_BAR_INITIAL_STATE, normalizeScrollMetrics, reduceTabBarScroll } from '../tabBarScroll';

describe('floatingBarScrollProps', () => {
  it('iOS: contentInset.top + başlangıç ofseti -inset + gösterge inset (padding yok)', () => {
    expect(floatingBarScrollProps(111, 'ios')).toMatchObject({
      contentInset: { top: 111 },
      contentOffset: { x: 0, y: -111 },
      scrollIndicatorInsets: { top: 111 },
      automaticallyAdjustContentInsets: false,
    });
    expect(floatingBarScrollProps(111, 'ios').contentContainerStyle).toBeUndefined();
  });

  it('Android: içerik paddingTop, inset yok', () => {
    const p = floatingBarScrollProps(111, 'android');
    expect(p.contentContainerStyle).toEqual({ paddingTop: 111 });
    expect(p.contentInset).toBeUndefined();
  });
});

describe('searchHideStyle', () => {
  it('açık (0): tam görünür, kayma yok', () => {
    const s = searchHideStyle(false, 0, -120);
    expect(s.opacity).toBe(1);
    // `0 * negatif` -0 üretir; sayısal olarak 0.
    expect(s.transform.map((t) => Math.abs(Object.values(t)[0] as number))).toEqual([0, 0]);
  });

  it('gizli (1): saydam, YUKARI (negatif Y) ve SOLA (negatif X) kaymış', () => {
    const s = searchHideStyle(false, 1, -120);
    expect(s.opacity).toBe(0);
    expect(s.transform).toEqual([{ translateY: SEARCH_HIDE_TRANSLATE_Y }, { translateX: SEARCH_HIDE_TRANSLATE_X }]);
    expect(SEARCH_HIDE_TRANSLATE_Y).toBeLessThan(0);
    expect(SEARCH_HIDE_TRANSLATE_X).toBeLessThan(0);
    expect(Math.abs(SEARCH_HIDE_TRANSLATE_Y)).toBeLessThanOrEqual(APP_SHELL_BAR_HEIGHT);
  });

  it('ara değerler doğrusal', () => {
    expect(searchHideStyle(false, 0.5, -120).opacity).toBe(0.5);
  });
});

describe('searchHideStyle — cam (native cam opacity < 1 iken efektini kaybeder)', () => {
  it('camda yüzeye opacity verilmez; ekranın üstünden (glassHideY) ve sola kayar', () => {
    const s = searchHideStyle(true, 1, -120);
    expect('opacity' in s).toBe(false);
    expect(s.transform).toEqual([{ translateY: -120 }, { translateX: SEARCH_HIDE_TRANSLATE_X }]);
  });

  it('içerik camda yüzeyin içinde solar; fallback\'te sarmalayıcı soluyor (içerik 1)', () => {
    expect(searchContentOpacity(true, 0.25)).toBe(0.75);
    expect(searchContentOpacity(false, 0.25)).toBe(1);
  });
});

describe('normalizeScrollMetrics — iOS contentInset normalizasyonu', () => {
  it('inset yokken ofset ve aralık değişmez', () => {
    expect(normalizeScrollMetrics(120, 3000, 800)).toEqual({ y: 120, maxY: 2200 });
  });

  it('iOS üst inset: dinlenme ofseti (-inset) içerik başı (0) olur; aralığa inset eklenir', () => {
    expect(normalizeScrollMetrics(-100, 3000, 800, 100)).toEqual({ y: 0, maxY: 2300 });
    expect(normalizeScrollMetrics(60, 3000, 800, 100)).toEqual({ y: 160, maxY: 2300 });
  });

  it('liste başında (dinlenme) açık; kaydırınca iOS ve Android aynı kararı verir', () => {
    const rest = normalizeScrollMetrics(-100, 3000, 800, 100);
    expect(reduceTabBarScroll(TAB_BAR_INITIAL_STATE, rest.y, rest.maxY).collapsed).toBe(false);
    // Aynı fiziksel konum: iOS ham ofset 0 (inset 100) = Android ham ofset 100 (padding 100, contentSize +100).
    const ios = normalizeScrollMetrics(0, 3000, 800, 100);
    const android = normalizeScrollMetrics(100, 3100, 800, 0);
    expect(ios).toEqual(android);
    expect(reduceTabBarScroll({ collapsed: false, anchor: 0, lastY: 0 }, ios.y, ios.maxY).collapsed).toBe(true);
  });
});
