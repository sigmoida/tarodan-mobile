import { flattenPagesUnique, nextPageFromInfo, readPageInfo } from '../infinite';

describe('sayfalı liste yardımcıları', () => {
  it('readPageInfo: meta varsa okur, yoksa tek sayfa sayar', () => {
    expect(readPageInfo({ data: [], meta: { page: 2, totalPages: 5 } }, 1)).toEqual({ page: 2, totalPages: 5 });
    expect(readPageInfo({ data: [] }, 3)).toEqual({ page: 3, totalPages: 1 });
    expect(readPageInfo(null, 1)).toEqual({ page: 1, totalPages: 1 });
  });

  it('nextPageFromInfo: son sayfada undefined, aksi halde sayfa + 1 (maxPages düşürse de)', () => {
    expect(nextPageFromInfo({ page: 6, totalPages: 9 })).toBe(7);
    expect(nextPageFromInfo({ page: 9, totalPages: 9 })).toBeUndefined();
  });

  it('flattenPagesUnique: sayfalar arası tekrarı ilk geleni tutarak eler', () => {
    const pages = [{ items: [{ id: 'a' }, { id: 'b' }] }, { items: [{ id: 'b' }, { id: 'c' }] }];
    expect(flattenPagesUnique(pages, (p) => p.items, (i) => i.id).map((i) => i.id)).toEqual(['a', 'b', 'c']);
    expect(flattenPagesUnique(undefined, (p: { items: { id: string }[] }) => p.items, (i) => i.id)).toEqual([]);
  });
});
