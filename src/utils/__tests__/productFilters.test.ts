import {
  EMPTY_FILTERS,
  buildListParams,
  clearProductFilters,
  countActiveFilters,
  filtersFromSearchParams,
  flattenUniqueListings,
  hasPriceFilter,
  isPriceFilterRefused,
  priceFilterBound,
  priceFilterParam,
  priceFilterText,
  type ProductFilters,
} from '../productFilters';

const CAR_MODEL = '44444444-4444-4444-8444-444444444444';

/**
 * The URL a saved search runs with: the exact output of tarodan-app
 * `savedSearchToRouteParams(query, labels)` (`packages/types/src/saved-search.ts`) for a search
 * that sets every allow-listed key, with the labels of the category, brand, manufacturer and car
 * model. Pasted as a fixture until the file is vendored into `src/types` (saved searches, C6).
 */
const SAVED_SEARCH_ROUTE_PARAMS = {
  search: 'ferrari',
  categoryId: '11111111-1111-4111-8111-111111111111',
  brandId: '22222222-2222-4222-8222-222222222222',
  manufacturerId: '33333333-3333-4333-8333-333333333333',
  carModelId: CAR_MODEL,
  scale: '1:64',
  material: 'diecast',
  color: 'black,red',
  condition: 'like_new',
  minPrice: '100',
  maxPrice: '500',
  tradeOnly: 'true',
  discountOnly: 'true',
  preOrder: 'true',
  limited: 'true',
  set: 'true',
  sortBy: 'view_count_asc',
  'attr.hw-segment': 'premium',
  'attr.rarity': 'common,rare',
  category: 'Diecast',
  brand: 'Ferrari',
  manufacturer: 'Hot Wheels',
  carModel: 'F40',
};

/** The canonical saved query (what `GET /products` receives), in the API's own form. */
const SAVED_SEARCH_QUERY = {
  search: 'ferrari',
  categoryId: '11111111-1111-4111-8111-111111111111',
  brandId: '22222222-2222-4222-8222-222222222222',
  manufacturerId: '33333333-3333-4333-8333-333333333333',
  carModelId: CAR_MODEL,
  scale: '1:64',
  material: 'diecast',
  color: 'black,red',
  condition: 'like_new',
  minPrice: 100,
  maxPrice: 500,
  tradeOnly: true,
  discountOnly: true,
  preOrder: true,
  limited: true,
  set: true,
  attrGroups: '{"hw-segment":["premium"],"rarity":["common","rare"]}',
  sortBy: 'view_count_asc',
};

describe('productFilters', () => {
  it("varsayılan sıralama web gibi 'relevance' ve sunucuya gönderilmez", () => {
    expect(EMPTY_FILTERS.sortBy).toBe('relevance');
    expect(buildListParams(EMPTY_FILTERS, 1, 24)).toEqual({ limit: 24, page: 1 });
  });

  it('new filters are off by default and absent from the API params', () => {
    expect(EMPTY_FILTERS).toMatchObject({
      carModelId: '',
      carModel: '',
      colors: [],
      preOrder: false,
      limited: false,
      set: false,
    });
    expect(buildListParams(EMPTY_FILTERS, 1, 24)).toEqual({ limit: 24, page: 1 });
  });

  it('API params use the web names: carModelId, color (comma list), preOrder, limited, set', () => {
    const params = buildListParams(
      {
        ...EMPTY_FILTERS,
        carModelId: CAR_MODEL,
        carModel: 'F40',
        colors: ['red', 'black'],
        preOrder: true,
        limited: true,
        set: true,
      },
      2,
      24,
    );
    expect(params).toEqual({
      limit: 24,
      page: 2,
      carModelId: CAR_MODEL,
      color: 'red,black',
      preOrder: true,
      limited: true,
      set: true,
    });
    // The display name never goes to the API: the id is the filter.
    expect(params).not.toHaveProperty('carModel');
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

  it('the filter count includes car model, colours (one filter), pre-order, limited and set', () => {
    expect(countActiveFilters({ ...EMPTY_FILTERS, carModelId: 'm', carModel: 'F40' })).toBe(1);
    expect(countActiveFilters({ ...EMPTY_FILTERS, colors: ['red', 'black', 'blue'] })).toBe(1);
    expect(countActiveFilters({ ...EMPTY_FILTERS, preOrder: true, limited: true, set: true })).toBe(3);
  });

  it('Clear resets the new filters like web and keeps search and sort', () => {
    const cleared = clearProductFilters({
      ...EMPTY_FILTERS,
      search: 'ferrari',
      sortBy: 'view_count_asc',
      carModelId: 'm',
      carModel: 'F40',
      colors: ['red'],
      preOrder: true,
      limited: true,
      set: true,
    });
    expect(cleared).toEqual({ ...EMPTY_FILTERS, search: 'ferrari', sortBy: 'view_count_asc' });
    expect(countActiveFilters(cleared)).toBe(0);
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

describe('filtersFromSearchParams · web URL parity', () => {
  it('reads a web URL: color list, pre-order and car model', () => {
    const f = filtersFromSearchParams({
      color: 'red,black',
      preOrder: 'true',
      carModelId: CAR_MODEL,
      carModel: 'F40',
    });
    expect(f).toMatchObject({
      colors: ['red', 'black'],
      preOrder: true,
      carModelId: CAR_MODEL,
      carModel: 'F40',
    });
    expect(buildListParams(f, 1, 24)).toEqual({
      limit: 24,
      page: 1,
      carModelId: CAR_MODEL,
      color: 'red,black',
      preOrder: true,
    });
    expect(countActiveFilters(f)).toBe(3);
  });

  it.each([
    ['preOrder', 'preOrder'],
    ['limited', 'limited'],
    ['set', 'set'],
    ['tradeOnly', 'tradeOnly'],
    ['discountOnly', 'discountOnly'],
  ] as const)('%s is on only for the exact value "true"', (param, key) => {
    expect(filtersFromSearchParams({ [param]: 'true' })[key]).toBe(true);
    for (const raw of ['', '1', 'TRUE', 'false', 'yes']) {
      expect(filtersFromSearchParams({ [param]: raw })[key]).toBe(false);
    }
    expect(filtersFromSearchParams({})[key]).toBe(false);
  });

  it('colour slugs are trimmed, de-duplicated and blank entries dropped', () => {
    expect(filtersFromSearchParams({ color: ' red, ,black,red,' }).colors).toEqual(['red', 'black']);
    expect(filtersFromSearchParams({ color: '' }).colors).toEqual([]);
    expect(filtersFromSearchParams({ color: ['red,blue', 'green'] }).colors).toEqual(['red', 'blue']);
  });

  it('free text stays readable as search (web) or q (legacy)', () => {
    expect(filtersFromSearchParams({ search: 'ferrari' }).search).toBe('ferrari');
    expect(filtersFromSearchParams({ q: 'ferrari' }).search).toBe('ferrari');
  });

  it('every explicit GET /products sort is accepted; unknown and "relevance" fall back to the default', () => {
    // SAVED_SEARCH_SORTS of tarodan-app packages/types (= the `GET /products` sortBy union).
    const served = [
      'price_asc',
      'price_desc',
      'created_asc',
      'created_desc',
      'title_asc',
      'title_desc',
      'view_count_desc',
      'view_count_asc',
      'rating_desc',
    ];
    for (const sortBy of served) {
      const f = filtersFromSearchParams({ sortBy });
      expect(f.sortBy).toBe(sortBy);
      expect(buildListParams(f, 1, 24).sortBy).toBe(sortBy);
    }
    expect(filtersFromSearchParams({ sortBy: 'newest' }).sortBy).toBe('relevance');
    expect(filtersFromSearchParams({ sortBy: 'relevance' }).sortBy).toBe('relevance');
    expect(buildListParams(filtersFromSearchParams({ sortBy: 'newest' }), 1, 24)).not.toHaveProperty('sortBy');
  });

  describe('a URL built by savedSearchToRouteParams', () => {
    const f = filtersFromSearchParams(SAVED_SEARCH_ROUTE_PARAMS);

    it('fills every filter, the display names included', () => {
      expect(f).toEqual<ProductFilters>({
        search: 'ferrari',
        category: 'Diecast',
        categoryId: '11111111-1111-4111-8111-111111111111',
        brand: 'Ferrari',
        brandId: '22222222-2222-4222-8222-222222222222',
        manufacturer: 'Hot Wheels',
        manufacturerId: '33333333-3333-4333-8333-333333333333',
        carModel: 'F40',
        carModelId: CAR_MODEL,
        scale: '1:64',
        material: 'diecast',
        colors: ['black', 'red'],
        condition: 'like_new',
        minPrice: '100',
        maxPrice: '500',
        tradeOnly: true,
        discountOnly: true,
        preOrder: true,
        limited: true,
        set: true,
        sortBy: 'view_count_asc',
        customAttributes: { 'hw-segment': ['premium'], rarity: ['common', 'rare'] },
      });
    });

    it('runs the same query that was saved (nothing silently dropped or broadened)', () => {
      const { limit, page, ...rest } = buildListParams(f, 1, 24);
      expect({ limit, page }).toEqual({ limit: 24, page: 1 });
      expect(rest).toEqual(SAVED_SEARCH_QUERY);
    });

    it('counts every filter once (paired id + name = one)', () => {
      // brand, car model, manufacturer, category, scale, material, colours, condition, price,
      // trade, discount, pre-order, limited, set + two attribute groups.
      expect(countActiveFilters(f)).toBe(16);
    });

    it('Clear leaves only search and sort', () => {
      expect(clearProductFilters(f)).toEqual({ ...EMPTY_FILTERS, search: 'ferrari', sortBy: 'view_count_asc' });
    });
  });
});

/** Same cases as web `listings/_lib/params.test.ts` (price filter bounds): both read with `parseTlAmount`. */
describe('price filter bounds (web parity)', () => {
  it.each([
    ['1000', 1000],
    ['1250.5', 1250.5],
    ['1250,5', 1250.5],
    ['1250,50', 1250.5],
    ['0,57', 0.57],
    [' 500 ', 500],
    ['12,', 12],
  ])('%j is the bound %d', (text, bound) => {
    expect(priceFilterBound(text)).toBe(bound);
    expect(isPriceFilterRefused(text)).toBe(false);
  });

  it.each(['', '  ', '0', '0,00', ','])('%j sets no bound and is not refused', (text) => {
    expect(priceFilterBound(text)).toBeUndefined();
    expect(isPriceFilterRefused(text)).toBe(false);
    expect(priceFilterParam(text)).toBe('');
  });

  // "1.000" is one thousand to a Turkish user: refused, never 1 TL.
  it.each(['1.000', '1.250,50', '1,000.50', '10.000', '1e3', '-5', 'abc', '1 000'])(
    '%j is refused and sets no bound',
    (text) => {
      expect(isPriceFilterRefused(text)).toBe(true);
      expect(priceFilterBound(text)).toBeUndefined();
    },
  );

  it('the canonical value is a plain number with a dot', () => {
    expect(priceFilterParam('1250,50')).toBe('1250.5');
    expect(priceFilterParam('100,00')).toBe('100');
  });

  it('counts as a filter only when a bound is set', () => {
    expect(hasPriceFilter({ minPrice: '100', maxPrice: '' })).toBe(true);
    expect(hasPriceFilter({ minPrice: '1.000', maxPrice: '' })).toBe(false);
    expect(hasPriceFilter({ minPrice: '0', maxPrice: '0' })).toBe(false);
    expect(countActiveFilters({ ...EMPTY_FILTERS, minPrice: '1.000' })).toBe(0);
    expect(countActiveFilters({ ...EMPTY_FILTERS, minPrice: '1000', maxPrice: '2000' })).toBe(1);
  });
});

describe('price bounds in the API params', () => {
  const api = (minPrice: string, maxPrice: string) =>
    buildListParams({ ...EMPTY_FILTERS, minPrice, maxPrice }, 1, 24);

  it('sends the parsed bounds as numbers', () => {
    expect(api('1250,50', '2000')).toMatchObject({ minPrice: 1250.5, maxPrice: 2000 });
  });

  it('never sends refused text: "1.000" is no bound, not 1 TL', () => {
    const params = api('1.000', '10.000');
    expect(params).not.toHaveProperty('minPrice');
    expect(params).not.toHaveProperty('maxPrice');
  });

  it('drops zero bounds (zero = no bound)', () => {
    expect(api('0', '0')).toEqual({ limit: 24, page: 1 });
  });

  it('keeps a min above the max as it is (no swap, as on web)', () => {
    expect(api('500', '100')).toMatchObject({ minPrice: 500, maxPrice: 100 });
  });

  it('a legacy grouped URL value is kept as field text and its bound ignored', () => {
    const f = filtersFromSearchParams({ minPrice: '1.000', maxPrice: '5000' });
    expect(f.minPrice).toBe('1.000');
    expect(isPriceFilterRefused(f.minPrice)).toBe(true);
    const params = buildListParams(f, 1, 24);
    expect(params).not.toHaveProperty('minPrice');
    expect(params.maxPrice).toBe(5000);
  });

  it('a canonical URL value (old links and saved searches) reads as written', () => {
    const params = buildListParams(filtersFromSearchParams({ minPrice: '1000', maxPrice: '1250.5' }), 1, 24);
    expect(params).toMatchObject({ minPrice: 1000, maxPrice: 1250.5 });
  });
});

describe('price field prefill from the URL (web parity)', () => {
  it('prefills a bound with a decimal comma (tlAmountInputValue)', () => {
    expect(priceFilterText('1250.5')).toBe('1250,50');
    expect(priceFilterText('1000')).toBe('1000');
    expect(filtersFromSearchParams({ minPrice: '99.99', maxPrice: '500' })).toMatchObject({
      minPrice: '99,99',
      maxPrice: '500',
    });
  });

  it('keeps refused text so the field shows the refusal', () => {
    expect(priceFilterText('1.000')).toBe('1.000');
    expect(priceFilterText('-5')).toBe('-5');
  });

  it('empty and zero prefill nothing', () => {
    expect(priceFilterText('')).toBe('');
    expect(priceFilterText('0')).toBe('');
  });
});
