import { buildActiveChips } from '../activeFilterChips';
import { EMPTY_FILTERS, type ProductFilters } from '@/utils/productFilters';

const GROUPS = [
  { slug: 'rarity', name: 'Nadirlik', manufacturerSlug: null, attributes: [] },
  { slug: 'segment', name: 'Segment', manufacturerSlug: 'hot-wheels', attributes: [] },
];
const t = ((k: string) => k) as any;

/** setFilters taklidi: fonksiyonel güncellemeyi verilen state'e uygular. */
function remove(filters: ProductFilters, key: string, groups?: typeof GROUPS): ProductFilters {
  let out: ProductFilters = filters;
  const set = (u: (p: ProductFilters) => ProductFilters) => {
    out = u(filters);
  };
  buildActiveChips(filters, set, t, groups).find((c) => c.key === key)!.onRemove();
  return out;
}

describe('buildActiveChips · üretici çipi', () => {
  const filters: ProductFilters = {
    ...EMPTY_FILTERS,
    manufacturer: 'Hot Wheels',
    manufacturerId: 'm1',
    customAttributes: { rarity: ['rare'], segment: ['premium'] },
  };

  it('kaldırınca üreticiye bağlı seçim düşer, genel grup kalır', () => {
    expect(remove(filters, 'manuf', GROUPS)).toMatchObject({
      manufacturer: '',
      manufacturerId: '',
      customAttributes: { rarity: ['rare'] },
    });
  });

  it('grup listesi yüklenmemişse güvenli tarafta hepsi düşer', () => {
    expect(remove(filters, 'manuf').customAttributes).toEqual({});
  });
});

describe('buildActiveChips · genel', () => {
  it('yalnız aktif filtreler için çip üretir', () => {
    const chips = buildActiveChips({ ...EMPTY_FILTERS, brand: 'Maisto', brandId: 'b1' }, jest.fn(), t);
    expect(chips.map((c) => c.key)).toEqual(['brand']);
  });

  it('çip kaldırma fonksiyonel güncelleme verir: araya giren arama metni ezilmez', () => {
    const stale: ProductFilters = { ...EMPTY_FILTERS, scale: '1:64' };
    const setFilters = jest.fn();
    buildActiveChips(stale, setFilters, t)[0]!.onRemove();
    const updater = setFilters.mock.calls[0][0] as (p: ProductFilters) => ProductFilters;
    expect(updater({ ...stale, search: 'ferrari' })).toMatchObject({ scale: '', search: 'ferrari' });
  });
});

describe('buildActiveChips · web parity filters', () => {
  const names = {
    carModels: [{ id: 'cm1', name: 'F40', slug: 'f40', brandId: 'b1' }],
    colors: [
      { slug: 'red', label: 'Kırmızı', color: 'swatch-red' },
      { slug: 'black', label: 'Siyah', color: null },
    ],
  };
  const chipsOf = (filters: ProductFilters, opts: Parameters<typeof buildActiveChips>[4] = names) =>
    buildActiveChips(filters, jest.fn(), t, [], opts);

  it('car model chip shows the display name, then the option name by id, then a generic label', () => {
    expect(chipsOf({ ...EMPTY_FILTERS, carModelId: 'cm1', carModel: 'Testarossa' })[0]).toMatchObject({
      key: 'model',
      label: 'Testarossa',
    });
    expect(chipsOf({ ...EMPTY_FILTERS, carModelId: 'cm1' })[0]!.label).toBe('F40');
    expect(chipsOf({ ...EMPTY_FILTERS, carModelId: 'cm1' }, {})[0]!.label).toBe('product.model');
  });

  it('removing the car model chip clears the id and the name', () => {
    expect(remove({ ...EMPTY_FILTERS, carModelId: 'cm1', carModel: 'F40' }, 'model')).toMatchObject({
      carModelId: '',
      carModel: '',
    });
  });

  it('removing the brand chip also clears the car model (it belongs to the brand)', () => {
    const out = remove(
      { ...EMPTY_FILTERS, brand: 'Ferrari', brandId: 'b1', carModelId: 'cm1', carModel: 'F40' },
      'brand',
    );
    expect(out).toMatchObject({ brand: '', brandId: '', carModelId: '', carModel: '' });
  });

  it('one chip per colour, labelled from the options (slug as the fallback)', () => {
    const chips = chipsOf({ ...EMPTY_FILTERS, colors: ['red', 'black', 'teal'] });
    expect(chips.map((c) => [c.key, c.label])).toEqual([
      ['color:red', 'Kırmızı'],
      ['color:black', 'Siyah'],
      ['color:teal', 'teal'],
    ]);
  });

  it('removing one colour chip keeps the other colours', () => {
    expect(remove({ ...EMPTY_FILTERS, colors: ['red', 'black'] }, 'color:red').colors).toEqual(['black']);
  });

  it('pre-order, limited and set chips use the web labels and clear their flag', () => {
    const f = { ...EMPTY_FILTERS, preOrder: true, limited: true, set: true };
    expect(chipsOf(f).map((c) => [c.key, c.label])).toEqual([
      ['preOrder', 'product.preOrder'],
      ['limited', 'product.limitedEdition'],
      ['set', 'product.sets'],
    ]);
    expect(remove(f, 'limited')).toMatchObject({ preOrder: true, limited: false, set: true });
  });

  it('trade and discount chips use the shared web keys (product.tradeAvailable, product.onSale)', () => {
    const f = { ...EMPTY_FILTERS, tradeOnly: true, discountOnly: true };
    expect(chipsOf(f).map((c) => [c.key, c.label])).toEqual([
      ['trade', 'product.tradeAvailable'],
      ['disc', 'product.onSale'],
    ]);
    expect(remove(f, 'disc')).toMatchObject({ tradeOnly: true, discountOnly: false });
  });
});

describe('buildActiveChips · price chip', () => {
  const priceChip = (minPrice: string, maxPrice: string) =>
    buildActiveChips({ ...EMPTY_FILTERS, minPrice, maxPrice }, jest.fn(), t).find((c) => c.key === 'price');

  it('labels the applied bounds as TL amounts', () => {
    expect(priceChip('1000', '1250,5')?.label).toBe('1.000,00 TL - 1.250,50 TL');
    expect(priceChip('1000', '')?.label).toBe('1.000,00 TL - ∞');
    expect(priceChip('', '500')?.label).toBe('0,00 TL - 500,00 TL');
  });

  it('never shows a refused "1.000" as 1 TL', () => {
    expect(priceChip('1.000', '500')?.label).toBe('0,00 TL - 500,00 TL');
    expect(priceChip('1.000', '')).toBeUndefined();
    expect(priceChip('0', '')).toBeUndefined();
  });
});
