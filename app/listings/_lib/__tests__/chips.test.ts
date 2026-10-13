import { buildActiveChips } from '../chips';
import { EMPTY_FILTERS, type ProductFilters } from '@/utils/productFilters';

const GROUPS = [
  { slug: 'rarity', name: 'Nadirlik', manufacturerSlug: null, attributes: [] },
  { slug: 'segment', name: 'Segment', manufacturerSlug: 'hot-wheels', attributes: [] },
];
const t = ((k: string) => k) as any;

describe('buildActiveChips · üretici çipi', () => {
  const filters: ProductFilters = {
    ...EMPTY_FILTERS,
    manufacturer: 'Hot Wheels',
    manufacturerId: 'm1',
    customAttributes: { rarity: ['rare'], segment: ['premium'] },
  };

  it('kaldırınca üreticiye bağlı seçim düşer, genel grup kalır', () => {
    const setFilters = jest.fn();
    const chip = buildActiveChips(filters, setFilters, t, GROUPS).find((c) => c.key === 'manuf')!;
    chip.onRemove();
    expect(setFilters).toHaveBeenCalledWith(
      expect.objectContaining({
        manufacturer: '',
        manufacturerId: '',
        customAttributes: { rarity: ['rare'] },
      }),
    );
  });

  it('grup listesi yüklenmemişse güvenli tarafta hepsi düşer', () => {
    const setFilters = jest.fn();
    buildActiveChips(filters, setFilters, t).find((c) => c.key === 'manuf')!.onRemove();
    expect(setFilters.mock.calls[0][0].customAttributes).toEqual({});
  });
});
