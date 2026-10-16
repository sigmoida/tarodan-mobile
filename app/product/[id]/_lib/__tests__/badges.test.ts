import { getProductBadges } from '../badges';
import type { PriceInfo } from '../display';

const price = (over: Partial<PriceInfo> = {}): PriceInfo => ({
  effectivePrice: 800,
  originalPrice: 1000,
  onSale: true,
  discountPct: 20,
  ...over,
});

describe('getProductBadges', () => {
  it('indirim + takas birlikte (Satıldı rozeti yok; durum uyarısı söyler)', () => {
    const b = getProductBadges(price(), true);
    expect(b).toEqual({ discountPct: 20, trade: true });
    expect(b).not.toHaveProperty('sold');
  });

  it('indirim yok, takas yok → hiçbiri', () => {
    expect(getProductBadges(price({ onSale: false, discountPct: 0 }), false)).toEqual({ discountPct: 0, trade: false });
  });

  it('indirim yüzdesi 0 ise indirim rozeti yok (onSale olsa bile)', () => {
    expect(getProductBadges(price({ discountPct: 0 }), false).discountPct).toBe(0);
  });

  it('onSale false ise yüzde dolu olsa da indirim rozeti yok', () => {
    expect(getProductBadges(price({ onSale: false }), false).discountPct).toBe(0);
  });
});
