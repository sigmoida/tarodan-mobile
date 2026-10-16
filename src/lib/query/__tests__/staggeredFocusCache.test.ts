import { QueryClient, QueryObserver, focusManager } from '@tanstack/react-query';
import {
  FOCUS_REFETCH_BATCH,
  FOCUS_REFETCH_STAGGER_MS,
  StaggeredFocusQueryCache,
} from '../staggeredFocusCache';
import { SLOW_DATA_STALE_MS, queryClient } from '../client';
import { qk } from '../keys';

describe('StaggeredFocusQueryCache', () => {
  let client: QueryClient;
  const unsubs: (() => void)[] = [];

  beforeEach(() => {
    jest.useFakeTimers();
    focusManager.setFocused(true);
    client = new QueryClient({
      queryCache: new StaggeredFocusQueryCache(),
      defaultOptions: { queries: { staleTime: 0, refetchOnWindowFocus: true, retry: false, networkMode: 'always' } },
    });
    client.mount();
  });
  afterEach(() => {
    unsubs.splice(0).forEach((u) => u());
    client.unmount();
    focusManager.setFocused(undefined);
    jest.useRealTimers();
  });

  /** Gözlemcisi olan, verisi dolu (eskimiş) n sorgu kurar; her birinin queryFn sayacını döner. */
  function observe(n: number) {
    const fns = Array.from({ length: n }, () => jest.fn().mockResolvedValue('x'));
    fns.forEach((fn, i) => {
      client.setQueryData(['q', i], 'cached');
      const obs = new QueryObserver(client, { queryKey: ['q', i], queryFn: fn, refetchOnMount: false });
      unsubs.push(obs.subscribe(() => undefined));
    });
    fns.forEach((fn) => fn.mockClear());
    return fns;
  }

  const calls = (fns: jest.Mock[]) => fns.filter((f) => f.mock.calls.length > 0).length;
  /** QueryClient odak dinleyicisi `resumePausedMutations`'ı bekleyip sonra `onFocus` çağırır. */
  const flush = () => jest.advanceTimersByTimeAsync(0);

  it('ön plana dönüşte eskimiş sorguları partiler halinde çeker', async () => {
    const fns = observe(10);
    focusManager.setFocused(false);
    focusManager.setFocused(true);
    await flush();
    expect(calls(fns)).toBe(FOCUS_REFETCH_BATCH);
    await jest.advanceTimersByTimeAsync(FOCUS_REFETCH_STAGGER_MS);
    expect(calls(fns)).toBe(FOCUS_REFETCH_BATCH * 2);
    await jest.advanceTimersByTimeAsync(FOCUS_REFETCH_STAGGER_MS);
    expect(calls(fns)).toBe(10);
  });

  it('önce en yeni oluşturulan sorgular çekilir', async () => {
    const fns = observe(6);
    focusManager.setFocused(false);
    focusManager.setFocused(true);
    await flush();
    expect(fns[5]).toHaveBeenCalled();
    expect(fns[0]).not.toHaveBeenCalled();
  });

  it('partiler sürerken yine arka plana geçilirse kalanlar çekilmez', async () => {
    const fns = observe(10);
    focusManager.setFocused(false);
    focusManager.setFocused(true);
    await flush();
    focusManager.setFocused(false);
    await jest.advanceTimersByTimeAsync(FOCUS_REFETCH_STAGGER_MS * 5);
    expect(calls(fns)).toBe(FOCUS_REFETCH_BATCH);
  });
});

describe('yavaş değişen katalog varsayılanları', () => {
  it('kategori / üretici / model / filtre seçenekleri 30 dk taze, odakta yeniden çekilmez', () => {
    for (const key of [
      qk.catalog.categories,
      qk.catalog.collectionCategories,
      qk.catalog.manufacturers,
      qk.catalog.carModels({ brand: 'x' }),
      qk.products.filterOptions('m'),
    ]) {
      const d = queryClient.getQueryDefaults(key);
      expect(d.staleTime).toBe(SLOW_DATA_STALE_MS);
      expect(d.refetchOnWindowFocus).toBe(false);
    }
    expect(queryClient.getQueryDefaults(qk.products.detail('1')).staleTime).toBeUndefined();
  });
});
