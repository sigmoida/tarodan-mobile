import {
  CONTENT_FADE_MAX_OPACITY,
  contentFadeOpacity,
  contentTranslateX,
  dragProgress,
  shouldCloseOnRelease,
  sideMenuWidth,
} from '../sideMenuMotion';

describe('sideMenuMotion (push çekmece geometrisi)', () => {
  it('içerik/panel kayması progress ile doğrusal: 0 kapalı, genişlik kadar açık', () => {
    expect(contentTranslateX(0, 312)).toBe(0);
    expect(contentTranslateX(0.5, 312)).toBe(156);
    expect(contentTranslateX(1, 312)).toBe(312);
  });

  it('açıkken sağda içeriğin ~%20si görünür kalır', () => {
    const w = 390;
    const width = sideMenuWidth(w);
    expect(w - contentTranslateX(1, width)).toBeCloseTo(w * 0.2, 0);
  });

  it('soluklaştırma 0..max arası, koyu örtü değil', () => {
    expect(contentFadeOpacity(0)).toBe(0);
    expect(contentFadeOpacity(1)).toBe(CONTENT_FADE_MAX_OPACITY);
    expect(CONTENT_FADE_MAX_OPACITY).toBeGreaterThanOrEqual(0.4);
    expect(CONTENT_FADE_MAX_OPACITY).toBeLessThanOrEqual(0.5);
  });

  it('sola sürükleme progress i düşürür ve 0..1 e kenetler', () => {
    expect(dragProgress(0, 300)).toBe(1);
    expect(dragProgress(-150, 300)).toBe(0.5);
    expect(dragProgress(-900, 300)).toBe(0);
    expect(dragProgress(80, 300)).toBe(1);
  });

  it('bırakınca: yeterince uzak ya da hızlıysa kapanır, değilse geri yaylanır', () => {
    expect(shouldCloseOnRelease(-100, -100, 300)).toBe(true);
    expect(shouldCloseOnRelease(-40, -50, 300)).toBe(false);
    expect(shouldCloseOnRelease(-10, -700, 300)).toBe(true);
  });
});
