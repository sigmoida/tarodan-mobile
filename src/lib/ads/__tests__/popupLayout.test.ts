import { popupMediaLimits, POPUP_MAX_HEIGHT_RATIO } from '../popupLayout';
import { fitBox } from '../adAspect';

describe('popupMediaLimits', () => {
  it('kart ekranın %80\'ini aşmaz; görsel kutusu iç boşluk (2x24) düşülmüş alandır', () => {
    const l = popupMediaLimits({ width: 390, height: 844 }, { top: 0, bottom: 0 });
    expect(l.cardMaxHeight).toBeCloseTo(844 * POPUP_MAX_HEIGHT_RATIO, 6);
    expect(l.height).toBeCloseTo(844 * 0.8 - 48, 6);
    expect(l.width).toBe(390 - 32 - 48);
  });

  it('güvenli alan %80\'den fazla yerse o baskın olur', () => {
    const l = popupMediaLimits({ width: 390, height: 300 }, { top: 100, bottom: 100 });
    expect(l.cardMaxHeight).toBe(300 - 200 - 32);
  });

  it('tablet: kart genişliği 480\'de kalır', () => {
    expect(popupMediaLimits({ width: 1024, height: 1366 }, { top: 0, bottom: 0 }).width).toBe(480 - 48);
  });

  it('çok küçük pencerede negatif boyut üretmez', () => {
    const l = popupMediaLimits({ width: 100, height: 100 }, { top: 60, bottom: 60 });
    expect(l.width).toBeGreaterThanOrEqual(0);
    expect(l.height).toBe(0);
  });

  it('1:2 reklam sınırlara sığar ve oranı korur', () => {
    const l = popupMediaLimits({ width: 390, height: 600 }, { top: 47, bottom: 34 });
    const b = fitBox(0.5, l.width, l.height);
    expect(b.height).toBeLessThanOrEqual(l.height);
    expect(b.width / b.height).toBeCloseTo(0.5, 6);
  });
});
