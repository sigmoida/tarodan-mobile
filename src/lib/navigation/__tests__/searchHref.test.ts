/**
 * Filtreli liste giriş noktaları → arama ekranı. Eşleme saf: giriş → `/search?…` adresi; arama
 * ekranı aynı adresi `filtersFromSearchParams` ile filtreye çevirir ve `buildActiveChips` ile
 * kaldırılabilir çip gösterir (gidiş-dönüş burada sınanır).
 */
import {
  SEARCH_ENTRIES,
  listingsToSearchHref,
  searchCategoryHref,
  searchEntryHref,
  searchHref,
  searchManufacturerHref,
  searchScaleHref,
} from '../searchHref';
import { EMPTY_FILTERS, buildSortOptions, filtersFromSearchParams } from '@/utils/productFilters';
import { buildActiveChips } from '@/utils/activeFilterChips';

const t = ((k: string) => k) as never;

/** `/search?a=1&b=2` → { a: '1', b: '2' } (expo-router'ın verdiği parametre şekli). */
function paramsOf(href: string): Record<string, string> {
  const q = href.split('?')[1] ?? '';
  return Object.fromEntries(
    q
      .split('&')
      .filter(Boolean)
      .map((p) => p.split('=').map(decodeURIComponent) as [string, string]),
  );
}

describe('searchEntryHref — vitrin girişleri', () => {
  it.each([
    ['all', '/search'],
    ['popular', '/search?sortBy=view_count_desc'],
    ['newArrivals', '/search?sortBy=created_desc'],
    ['onSale', '/search?discountOnly=true'],
    ['tradeShowcase', '/search?tradeOnly=true'],
  ] as const)('%s → %s', (entry, href) => {
    expect(searchEntryHref(entry)).toBe(href);
  });

  it('her giriş aramada beklenen filtre/sıralamayı kurar', () => {
    const f = (entry: keyof typeof SEARCH_ENTRIES) => filtersFromSearchParams(paramsOf(searchEntryHref(entry)));
    expect(f('all')).toEqual(EMPTY_FILTERS);
    expect(f('popular')).toEqual({ ...EMPTY_FILTERS, sortBy: 'view_count_desc' });
    expect(f('newArrivals')).toEqual({ ...EMPTY_FILTERS, sortBy: 'created_desc' });
    expect(f('onSale')).toEqual({ ...EMPTY_FILTERS, discountOnly: true });
    expect(f('tradeShowcase')).toEqual({ ...EMPTY_FILTERS, tradeOnly: true });
  });

  it('takas vitrini / indirim girişleri kaldırılabilir çip olarak görünür', () => {
    const filters = filtersFromSearchParams(paramsOf(searchEntryHref('tradeShowcase')));
    const set = jest.fn();
    const chips = buildActiveChips(filters, set, t);
    expect(chips.map((c) => c.key)).toEqual(['trade']);
    chips[0]!.onRemove();
    const updater = set.mock.calls[0]![0] as (p: typeof filters) => typeof filters;
    expect(updater(filters).tradeOnly).toBe(false);

    const sale = buildActiveChips(filtersFromSearchParams(paramsOf(searchEntryHref('onSale'))), set, t);
    expect(sale.map((c) => c.key)).toEqual(['disc']);
  });
});

describe('kimlikli girişler', () => {
  it('kategori / üretici / ölçek: kimlik + ad kodlanır, çip etiketi ad', () => {
    expect(searchCategoryHref({ id: 'c 1', name: 'Boş & Kategori' })).toBe(
      '/search?categoryId=c%201&category=Bo%C5%9F%20%26%20Kategori',
    );
    expect(searchManufacturerHref({ id: 'm1', name: 'Hot Wheels' })).toBe(
      '/search?manufacturer=Hot%20Wheels&manufacturerId=m1',
    );
    expect(searchManufacturerHref({ name: 'Hot Wheels' })).toBe('/search?manufacturer=Hot%20Wheels');
    expect(searchScaleHref('1:64')).toBe('/search?scale=1%3A64');

    const chips = buildActiveChips(
      filtersFromSearchParams(paramsOf(searchCategoryHref({ id: 'c1', name: 'Otomobil' }))),
      jest.fn(),
      t,
    );
    expect(chips.map((c) => c.label)).toEqual(['Otomobil']);
  });

  it('searchHref boş değerleri atlar, dizi değerin ilkini alır', () => {
    expect(searchHref({ a: '', b: undefined, c: null, d: false, e: ['x', 'y'], f: 2 })).toBe('/search?e=x&f=2');
  });
});

describe('listingsToSearchHref — eski /listings adresleri', () => {
  it('sorgu AYNEN taşınır (önünde ? olsa da olmasa da)', () => {
    expect(listingsToSearchHref()).toBe('/search');
    expect(listingsToSearchHref('?')).toBe('/search');
    expect(listingsToSearchHref('?tradeOnly=true')).toBe('/search?tradeOnly=true');
    expect(listingsToSearchHref('manufacturer=Hot+Wheels&sortBy=view_count_desc')).toBe(
      '/search?manufacturer=Hot+Wheels&sortBy=view_count_desc',
    );
  });
});

describe('filtersFromSearchParams — web /listings parametre adları', () => {
  it('tüm web parametrelerini okur; metin q ya da search', () => {
    expect(
      filtersFromSearchParams({
        search: 'ferrari',
        brand: 'Ferrari',
        brandId: 'b1',
        scale: '1:18',
        material: 'diecast',
        condition: 'new',
        minPrice: '10',
        maxPrice: '99',
        tradeOnly: 'true',
        discountOnly: 'false',
        sortBy: 'price_asc',
        category: 'Otomobil',
        categoryId: 'c1',
        manufacturer: 'Hot Wheels',
        manufacturerId: 'm1',
        carModelId: 'cm1',
        carModel: 'F40',
        color: 'red,black',
        preOrder: 'true',
        limited: 'true',
        set: 'true',
        'attr.hw-rarity': 'th, sth',
      }),
    ).toEqual({
      search: 'ferrari',
      brand: 'Ferrari',
      brandId: 'b1',
      scale: '1:18',
      material: 'diecast',
      condition: 'new',
      minPrice: '10',
      maxPrice: '99',
      tradeOnly: true,
      discountOnly: false,
      sortBy: 'price_asc',
      category: 'Otomobil',
      categoryId: 'c1',
      manufacturer: 'Hot Wheels',
      manufacturerId: 'm1',
      carModelId: 'cm1',
      carModel: 'F40',
      colors: ['red', 'black'],
      preOrder: true,
      limited: true,
      set: true,
      customAttributes: { 'hw-rarity': ['th', 'sth'] },
    });
    expect(filtersFromSearchParams({ q: 'mini', search: 'x' }).search).toBe('mini');
  });

  it('bilinmeyen sıralama yok sayılır; dizi parametrenin ilki alınır', () => {
    expect(filtersFromSearchParams({ sortBy: 'drop table' }).sortBy).toBe('relevance');
    expect(filtersFromSearchParams({ scale: ['1:64', '1:43'] }).scale).toBe('1:64');
  });

  it('sıralama doğrulaması buildSortOptions ile aynı tek diziden', () => {
    for (const { value } of buildSortOptions(t)) {
      expect(filtersFromSearchParams({ sortBy: value }).sortBy).toBe(value);
    }
  });
});

describe('yalnız kimlikli filtre çipi', () => {
  const names = {
    categories: [{ id: 'c1', name: 'Otomobil', slug: 'otomobil' }],
    brands: [{ id: 'b1', name: 'Ferrari', slug: 'ferrari' }],
    manufacturers: [{ id: 'm1', name: 'Hot Wheels', slug: 'hot-wheels' }],
  };
  it('ad seçenek listesinden çözülür, bulunamazsa genel etiket; kaldırılabilir', () => {
    const f = filtersFromSearchParams({ categoryId: 'c1', brandId: 'b1', manufacturerId: 'mX' });
    const set = jest.fn();
    const chips = buildActiveChips(f, set, t, [], names);
    expect(chips.map((c) => [c.key, c.label])).toEqual([
      ['cat', 'Otomobil'],
      ['brand', 'Ferrari'],
      ['manuf', 'product.manufacturer'],
    ]);
    chips[0]!.onRemove();
    const updater = set.mock.calls[0]![0] as (p: typeof f) => typeof f;
    expect(updater(f)).toMatchObject({ category: '', categoryId: '' });
    // Liste henüz yokken de çip var (genel etiket).
    expect(buildActiveChips(f, set, t).map((c) => c.label)).toEqual([
      'common.category',
      'product.brand',
      'product.manufacturer',
    ]);
  });
});
