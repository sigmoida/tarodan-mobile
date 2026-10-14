import {
  buildBrowseParams,
  filterAndSortMine,
  flattenCategories,
  flattenPages,
  getNextBrowsePage,
  unwrapCollectionsPage,
  type BrowseCollection,
} from '../_lib/browse';

describe('koleksiyon tarama yardımcıları (web _lib/data.ts paritesi)', () => {
  it('buildBrowseParams: sortBy her zaman, search/categoryId yalnız doluysa', () => {
    expect(buildBrowseParams('popular', '', '')).toEqual({ sortBy: 'popular' });
    expect(buildBrowseParams('items_desc', 'ferrari', 'c1')).toEqual({
      sortBy: 'items_desc',
      search: 'ferrari',
      categoryId: 'c1',
    });
  });

  it('unwrapCollectionsPage: { collections, total, page, pageSize } ve yalın dizi', () => {
    expect(unwrapCollectionsPage({ collections: [{ id: 'a' }], total: 5, page: 2, pageSize: 1 })).toEqual({
      collections: [{ id: 'a' }],
      total: 5,
      page: 2,
      pageSize: 1,
    });
    expect(unwrapCollectionsPage([{ id: 'a' }, { id: 'b' }], 3)).toMatchObject({ total: 2, page: 3 });
    expect(unwrapCollectionsPage(null).collections).toEqual([]);
  });

  it('getNextBrowsePage: toplam dolana kadar sonraki sayfa', () => {
    const page = (n: number, count: number, total: number) => ({
      collections: Array.from({ length: count }, (_, i) => ({ id: `${n}-${i}`, name: 'x' })),
      total,
      page: n,
      pageSize: 20,
    });
    expect(getNextBrowsePage(page(1, 20, 25))).toBe(2);
    expect(getNextBrowsePage(page(2, 5, 25))).toBeUndefined();
    expect(getNextBrowsePage(page(1, 0, 25))).toBeUndefined();
  });

  it('flattenPages: sayfalar arası tekrar eden kayıt bir kez', () => {
    const a = { id: 'a', name: 'A' };
    const b = { id: 'b', name: 'B' };
    expect(
      flattenPages([
        { collections: [a, b], total: 3, page: 1, pageSize: 2 },
        { collections: [b], total: 3, page: 2, pageSize: 2 },
      ]).map((c) => c.id),
    ).toEqual(['a', 'b']);
  });

  it('flattenCategories: alt kategoriler "—" önekli', () => {
    expect(
      flattenCategories([{ id: '1', name: 'Arabalar', children: [{ id: '2', name: 'Klasik' }] }]),
    ).toEqual([
      { id: '1', name: 'Arabalar' },
      { id: '2', name: '— Klasik' },
    ]);
  });

  describe('filterAndSortMine', () => {
    const list: BrowseCollection[] = [
      { id: '1', name: 'Zafer', viewCount: 5, itemCount: 1, createdAt: '2026-01-01' },
      { id: '2', name: 'çınar', viewCount: 50, itemCount: 9, createdAt: '2026-03-01', description: 'Ferrari' },
      { id: '3', name: 'Araba', viewCount: 10, itemCount: 4, createdAt: '2026-02-01' },
    ];
    const ids = (r: BrowseCollection[]) => r.map((c) => c.id);

    it('sıralamalar', () => {
      expect(ids(filterAndSortMine(list, '', 'popular'))).toEqual(['2', '3', '1']);
      expect(ids(filterAndSortMine(list, '', 'recent'))).toEqual(['2', '3', '1']);
      expect(ids(filterAndSortMine(list, '', 'name'))).toEqual(['3', '2', '1']);
      expect(ids(filterAndSortMine(list, '', 'items_asc'))).toEqual(['1', '3', '2']);
      expect(ids(filterAndSortMine(list, '', 'items_desc'))).toEqual(['2', '3', '1']);
    });

    it('ad/açıklama araması (büyük/küçük harf duyarsız)', () => {
      expect(ids(filterAndSortMine(list, 'FERRARI', 'popular'))).toEqual(['2']);
      expect(ids(filterAndSortMine(list, ' zaf ', 'popular'))).toEqual(['1']);
    });
  });
});
