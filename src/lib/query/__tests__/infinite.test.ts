import { InfiniteQueryObserver, QueryClient } from '@tanstack/react-query';
import {
  flattenPagesUnique,
  nextPageFromInfo,
  readPageInfo,
  trimInfiniteToFirstPage,
} from '../infinite';

describe('trimInfiniteToFirstPage', () => {
  const key = ['liste'];

  it('yüklü birden çok sayfayı ilk sayfaya kırpar', () => {
    const qc = new QueryClient();
    qc.setQueryData(key, { pages: ['p1', 'p2', 'p3'], pageParams: [1, 2, 3] });
    trimInfiniteToFirstPage(qc, key);
    expect(qc.getQueryData(key)).toEqual({ pages: ['p1'], pageParams: [1] });
  });

  it('tek sayfa ve 1. sayfa yerindeyse önbelleğe dokunmaz', () => {
    const qc = new QueryClient();
    const data = { pages: ['p1'], pageParams: [1] };
    qc.setQueryData(key, data);
    trimInfiniteToFirstPage(qc, key);
    expect(qc.getQueryData(key)).toBe(data);
  });

  it('maxPages 1. sayfayı düşürdüyse (pageParams[0] = 2) parametreyi başlangıca sıfırlar', () => {
    const qc = new QueryClient();
    qc.setQueryData(key, { pages: ['p2', 'p3', 'p4'], pageParams: [2, 3, 4] });
    trimInfiniteToFirstPage(qc, key);
    expect(qc.getQueryData(key)).toEqual({ pages: ['p2'], pageParams: [1] });
  });

  it('önbellek yoksa hiçbir şey yazmaz', () => {
    const qc = new QueryClient();
    trimInfiniteToFirstPage(qc, key);
    expect(qc.getQueryData(key)).toBeUndefined();
  });

  it('maxPages sonrası kırp + refetch 1. sayfayı getirir (2. sayfayı değil)', async () => {
    const qc = new QueryClient();
    const requested: number[] = [];
    const observer = new InfiniteQueryObserver(qc, {
      queryKey: key,
      initialPageParam: 1,
      maxPages: 2,
      queryFn: async ({ pageParam }) => {
        requested.push(pageParam as number);
        return { page: pageParam as number };
      },
      getNextPageParam: (last) => (last.page < 9 ? last.page + 1 : undefined),
    });
    const unsubscribe = observer.subscribe(() => {});
    await observer.refetch();
    await observer.fetchNextPage();
    await observer.fetchNextPage(); // maxPages: 1. sayfa düştü → [2, 3]
    expect(qc.getQueryData<{ pageParams: number[] }>(key)?.pageParams).toEqual([2, 3]);

    requested.length = 0;
    trimInfiniteToFirstPage(qc, key);
    await observer.refetch();

    expect(requested).toEqual([1]);
    expect(qc.getQueryData<{ pages: { page: number }[] }>(key)?.pages).toEqual([{ page: 1 }]);
    unsubscribe();
    qc.clear();
  });
});

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
