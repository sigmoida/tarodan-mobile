import {
  EMPTY_FILTERS,
  buildListParams,
  clearProductFilters,
  countActiveFilters,
  flattenUniqueListings,
} from '../productFilters';

describe('productFilters', () => {
  it("varsayılan sıralama web gibi 'relevance' ve sunucuya gönderilmez", () => {
    expect(EMPTY_FILTERS.sortBy).toBe('relevance');
    expect(buildListParams(EMPTY_FILTERS, 1, 24)).toEqual({ limit: 24, page: 1 });
  });

  it('kaldırılan filtreler (model, ön sipariş, limited, set) tipte/param’da yok', () => {
    expect(Object.keys(EMPTY_FILTERS)).not.toEqual(
      expect.arrayContaining(['carModel', 'carModelId', 'preOrder', 'limited', 'set']),
    );
    const params = buildListParams(
      { ...EMPTY_FILTERS, ...({ carModelId: 'm', preOrder: true, limited: true, set: true } as object) } as any,
      1,
      24,
    );
    expect(params).not.toHaveProperty('carModelId');
    expect(params).not.toHaveProperty('preOrder');
    expect(params).not.toHaveProperty('limited');
    expect(params).not.toHaveProperty('set');
  });

  it('sıralama değişince diğer param’lar AYNI kalır (yalnız sortBy eklenir/değişir)', () => {
    const base = { ...EMPTY_FILTERS, search: 'ferrari', brandId: 'b1', scale: '1:64' };
    const { sortBy: _omit, ...relevance } = buildListParams(base, 1, 24);
    for (const sortBy of ['created_desc', 'price_asc', 'price_desc', 'title_asc', 'view_count_desc']) {
      const { sortBy: sent, ...rest } = buildListParams({ ...base, sortBy }, 1, 24);
      expect(sent).toBe(sortBy);
      expect(rest).toEqual(relevance);
      expect(rest).not.toHaveProperty('minPrice');
      expect(rest).not.toHaveProperty('maxPrice');
    }
  });

  it('arama metni kırpılarak gönderilir; yalnız boşluksa gönderilmez', () => {
    expect(buildListParams({ ...EMPTY_FILTERS, search: '  araba ' }, 1, 24).search).toBe('araba');
    expect(buildListParams({ ...EMPTY_FILTERS, search: '   ' }, 1, 24)).not.toHaveProperty('search');
  });

  it('Temizle: filtreleri sıfırlar, sıralamayı ve arama metnini korur', () => {
    const cleared = clearProductFilters({
      ...EMPTY_FILTERS,
      search: 'ferrari',
      sortBy: 'price_asc',
      brand: 'Maisto',
      brandId: 'b1',
      minPrice: '100',
      tradeOnly: true,
      customAttributes: { rarity: ['rare'] },
    });
    expect(cleared).toEqual({ ...EMPTY_FILTERS, search: 'ferrari', sortBy: 'price_asc' });
    expect(countActiveFilters(cleared)).toBe(0);
  });

  it('filtre sayacı sortBy ve search saymaz', () => {
    expect(countActiveFilters({ ...EMPTY_FILTERS, sortBy: 'price_desc', search: 'x' })).toBe(0);
    expect(countActiveFilters({ ...EMPTY_FILTERS, brand: 'a', brandId: 'b', tradeOnly: true })).toBe(2);
  });

  it('flattenUniqueListings: sayfalar arası yinelenen id elenir, sıra korunur', () => {
    const pages = [
      { items: [{ id: 'a' }, { id: 'b' }] },
      { items: [{ id: 'b' }, { id: 'c' }] },
    ];
    expect(flattenUniqueListings(pages).map((i) => i.id)).toEqual(['a', 'b', 'c']);
    expect(flattenUniqueListings(undefined)).toEqual([]);
  });
});
