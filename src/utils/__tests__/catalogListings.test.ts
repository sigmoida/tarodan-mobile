import { hasListings, listingCount, selectWithListings } from '../catalogListings';

describe('catalogListings · ilanı olmayan üretici/marka gizlenir', () => {
  it('liste uç alanı `_count.products` önce okunur, sonra detay alanı `productCount`', () => {
    expect(listingCount({ _count: { products: 3 }, productCount: 9 })).toBe(3);
    expect(listingCount({ productCount: 9 })).toBe(9);
    expect(listingCount({})).toBe(0);
    expect(listingCount(null)).toBe(0);
  });

  it('0 ya da alan yok → ilan yok', () => {
    expect(hasListings({ _count: { products: 0 } })).toBe(false);
    expect(hasListings({ productCount: 0 })).toBe(false);
    expect(hasListings({})).toBe(false);
    expect(hasListings({ _count: { products: 1 } })).toBe(true);
    expect(hasListings({ productCount: 2 })).toBe(true);
  });

  it('select süzgeci sırayı korur', () => {
    const list = [
      { id: 'a', _count: { products: 2 } },
      { id: 'b', _count: { products: 0 } },
      { id: 'c', productCount: 1 },
    ];
    expect(selectWithListings(list).map((m) => m.id)).toEqual(['a', 'c']);
  });
});
