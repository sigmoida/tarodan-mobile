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
  it('yalnız aktif filtreler için çip üretir (model/ön sipariş/limited/set yok)', () => {
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
