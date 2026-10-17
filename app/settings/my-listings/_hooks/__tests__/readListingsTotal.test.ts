import { readListingsTotal } from '../useExpiredCount';

describe('readListingsTotal', () => {
  it('sayfalı yanıttan meta.total okur (veri limit=1 ile kısalmış olsa da)', () => {
    expect(readListingsTotal({ data: [{ id: 'a' }], meta: { total: 250, page: 1, limit: 1, totalPages: 250 } })).toBe(250);
  });
  it('meta yoksa data uzunluğuna, çıplak diziye ve boşa düşer', () => {
    expect(readListingsTotal({ data: [1, 2, 3] })).toBe(3);
    expect(readListingsTotal([1, 2])).toBe(2);
    expect(readListingsTotal(undefined)).toBe(0);
    expect(readListingsTotal({ meta: { total: 'x' } })).toBe(0);
  });
});
