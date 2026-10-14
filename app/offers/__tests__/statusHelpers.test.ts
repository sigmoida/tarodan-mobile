/**
 * Teklif kartı yardımcısı: "süresi yaklaşıyor" eşiği (< 6 sa).
 */
import { isExpiringSoon, OFFER_EXPIRING_SOON_HOURS } from '../_lib/status';

const HOUR = 3_600_000;

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
