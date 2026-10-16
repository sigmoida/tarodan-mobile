import { getProductBadges } from '../badges';
import type { PriceInfo } from '../display';
import type { Product } from '../types';

const product = (status: string | null = 'active') => ({ id: 'p1', title: 'x', status }) as Product;
const price = (over: Partial<PriceInfo> = {}): PriceInfo => ({
  effectivePrice: 800,
  originalPrice: 1000,
  onSale: true,
  discountPct: 20,
  ...over,
});

describe('getProductBadges', () => {
  it('satıldı + indirim + takas hepsi birlikte', () => {
    expect(getProductBadges(product('sold'), price(), true)).toEqual({ sold: true, discountPct: 20, trade: true });
  });

  it('yalnız aktif ilan, indirim yok, takas yok → hiçbiri', () => {
    expect(getProductBadges(product(), price({ onSale: false, discountPct: 0 }), false)).toEqual({
      sold: false,
      discountPct: 0,
      trade: false,
    });
  });

  it('indirim yüzdesi 0 ise indirim rozeti yok (onSale olsa bile)', () => {
    expect(getProductBadges(product(), price({ discountPct: 0 }), false).discountPct).toBe(0);
  });

  it('onSale false ise yüzde dolu olsa da indirim rozeti yok', () => {
    expect(getProductBadges(product(), price({ onSale: false }), false).discountPct).toBe(0);
  });

  it('rezerve ilan sold sayılmaz', () => {
    expect(getProductBadges(product('reserved'), price(), false).sold).toBe(false);
  });
});
