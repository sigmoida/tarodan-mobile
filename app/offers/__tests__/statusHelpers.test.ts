/**
 * Teklif kartı yardımcıları: indirim yüzdesi ve "süresi yaklaşıyor" eşiği (< 6 sa).
 */
import { getOfferDiscountPercent, isExpiringSoon, OFFER_EXPIRING_SOON_HOURS } from '../_lib/status';

const HOUR = 3_600_000;

describe('getOfferDiscountPercent', () => {
  it('ilan fiyatının altındaki teklifte yuvarlanmış yüzde', () => {
    expect(getOfferDiscountPercent(500, 600)).toBe(17);
    expect(getOfferDiscountPercent(300, 400)).toBe(25);
  });

  it('ilan fiyatına eşit / üstünde ya da fiyat bilinmiyorsa null', () => {
    expect(getOfferDiscountPercent(600, 600)).toBeNull();
    expect(getOfferDiscountPercent(700, 600)).toBeNull();
    expect(getOfferDiscountPercent(500, 0)).toBeNull();
    expect(getOfferDiscountPercent(0, 600)).toBeNull();
  });

  it('%0,5 altı fark 0 yuvarlanır → rozet yok', () => {
    expect(getOfferDiscountPercent(999, 1000)).toBeNull();
  });
});

describe('isExpiringSoon', () => {
  const now = Date.UTC(2026, 0, 1);
  const at = (ms: number) => new Date(now + ms).toISOString();

  it(`${OFFER_EXPIRING_SOON_HOURS} saatten az kalan → true`, () => {
    expect(isExpiringSoon(at(2 * HOUR), now)).toBe(true);
    expect(isExpiringSoon(at(OFFER_EXPIRING_SOON_HOURS * HOUR - 1), now)).toBe(true);
  });

  it('eşik ve üstü ya da süresi dolmuş → false', () => {
    expect(isExpiringSoon(at(OFFER_EXPIRING_SOON_HOURS * HOUR), now)).toBe(false);
    expect(isExpiringSoon(at(20 * HOUR), now)).toBe(false);
    expect(isExpiringSoon(at(-HOUR), now)).toBe(false);
  });
});
