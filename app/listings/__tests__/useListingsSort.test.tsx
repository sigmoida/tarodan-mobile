/**
 * İlanlar: sıralama değişince ürün sayısı SABİT kalır.
 *
 * Kullanıcı hatası: "fiyat sort edilince tek ürün görünüyor". İstemci tarafında sıralama yalnız
 * `sortBy` param'ını değiştirmeli; filtre/arama/sayfa/limit aynı kalmalı, liste sunucunun
 * döndürdüğü kümenin tamamını (sayfalar arası tekrarlar elenmiş) göstermeli.
 */
import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('expo-router', () => ({ useLocalSearchParams: jest.fn(() => ({})) }));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
jest.mock('@/hooks/useProductFilterOptions', () => ({
  useProductFilterOptions: () => ({
    categories: [],
    brands: [],
    manufacturers: [],
    scales: [],
    materials: [],
    customAttributes: [],
    isLoading: false,
  }),
}));
jest.mock('@/lib/api', () => ({ productsApi: { getAll: jest.fn() } }));

import { useLocalSearchParams } from 'expo-router';
import { productsApi } from '@/lib/api';
import { useListings } from '../_hooks/useListings';

const getAll = productsApi.getAll as jest.Mock;
const TOTAL = 30;
const LIMIT = 24;

/** Sunucu taklidi: sıralamadan bağımsız aynı 30 ürün, yalnız sıra değişir; sayfa başı 24. */
function serve(params: Record<string, any>) {
  const ids = Array.from({ length: TOTAL }, (_, i) => `p${i + 1}`);
  if (params.sortBy === 'price_desc') ids.reverse();
  const page = params.page ?? 1;
  const data = ids.slice((page - 1) * LIMIT, page * LIMIT).map((id) => ({ id, title: id }));
  return Promise.resolve({
    data: { data, meta: { total: TOTAL, page, limit: LIMIT, totalPages: Math.ceil(TOTAL / LIMIT) } },
  });
}

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

async function loadAll(result: { current: ReturnType<typeof useListings> }) {
  await waitFor(() => expect(result.current.listings.length).toBeGreaterThan(0));
  await waitFor(() => expect(result.current.isFetching).toBe(false));
  while (result.current.hasNextPage) {
    await act(async () => {
      await result.current.fetchNextPage();
    });
  }
  await waitFor(() => expect(result.current.isFetching).toBe(false));
}

beforeEach(() => {
  getAll.mockReset();
  getAll.mockImplementation(serve);
  (useLocalSearchParams as jest.Mock).mockReturnValue({});
});

describe('useListings · sıralama', () => {
  it('varsayılan sıralama relevance ve sunucuya sortBy gönderilmez', async () => {
    const { result } = renderHook(() => useListings(), { wrapper });
    await waitFor(() => expect(getAll).toHaveBeenCalled());
    expect(result.current.filters.sortBy).toBe('relevance');
    expect(getAll.mock.calls[0]![0]).toEqual({ limit: LIMIT, page: 1 });
  });

  it.each(['price_asc', 'price_desc', 'created_desc', 'title_asc'])(
    '%s seçilince ürün sayısı ve toplam aynı kalır, başka param değişmez',
    async (sortBy) => {
      const { result } = renderHook(() => useListings(), { wrapper });
      await loadAll(result);
      expect(result.current.listings).toHaveLength(TOTAL);
      expect(result.current.total).toBe(TOTAL);

      getAll.mockClear();
      act(() => result.current.setSortBy(sortBy));
      await waitFor(() => expect(getAll).toHaveBeenCalled());
      await loadAll(result);
      await waitFor(() => expect(result.current.filters.sortBy).toBe(sortBy));

      expect(result.current.listings).toHaveLength(TOTAL);
      expect(result.current.total).toBe(TOTAL);
      const sent = getAll.mock.calls[0]![0];
      expect(sent).toEqual({ limit: LIMIT, page: 1, sortBy });
      expect(sent).not.toHaveProperty('minPrice');
      expect(sent).not.toHaveProperty('maxPrice');
      expect(sent).not.toHaveProperty('search');
    },
  );

  it('sıralama değişince mevcut filtreler ve arama korunur', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ search: 'ferrari', scale: '1:64' });
    const { result } = renderHook(() => useListings(), { wrapper });
    await waitFor(() => expect(result.current.listings.length).toBeGreaterThan(0));
    act(() => result.current.setSortBy('price_asc'));
    await waitFor(() => expect(result.current.filters.sortBy).toBe('price_asc'));
    expect(result.current.filters).toMatchObject({ search: 'ferrari', scale: '1:64' });
  });

  it('sayfalar arası yinelenen id tek sayılır (eşit fiyatlı satırlar)', async () => {
    getAll.mockImplementation((params: Record<string, any>) => {
      const page = params.page ?? 1;
      // 2. sayfa, 1. sayfanın son iki ürününü tekrar döndürür (kararsız sıralama).
      const ids =
        page === 1
          ? Array.from({ length: LIMIT }, (_, i) => `p${i + 1}`)
          : [`p${LIMIT - 1}`, `p${LIMIT}`, 'x1', 'x2'];
      return Promise.resolve({
        data: {
          data: ids.map((id) => ({ id })),
          meta: { total: LIMIT + 2, page, limit: LIMIT, totalPages: 2 },
        },
      });
    });
    const { result } = renderHook(() => useListings(), { wrapper });
    await loadAll(result);
    const ids = result.current.listings.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(LIMIT + 2);
  });

  it('Temizle sıralamayı ve arama metnini korur, filtreleri sıfırlar', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      search: 'ferrari',
      sortBy: 'price_asc',
      scale: '1:64',
      tradeOnly: 'true',
    });
    const { result } = renderHook(() => useListings(), { wrapper });
    await waitFor(() => expect(result.current.listings.length).toBeGreaterThan(0));
    expect(result.current.activeFilterCount).toBe(2);
    act(() => result.current.clearFilters());
    expect(result.current.filters).toMatchObject({
      search: 'ferrari',
      sortBy: 'price_asc',
      scale: '',
      tradeOnly: false,
    });
    expect(result.current.activeFilterCount).toBe(0);
  });

  it('filtre sayfasındaki arama üst kutuya yansır (tek kaynak filters.search)', async () => {
    const { result } = renderHook(() => useListings(), { wrapper });
    await waitFor(() => expect(result.current.listings.length).toBeGreaterThan(0));
    act(() => result.current.setFilters((prev) => ({ ...prev, search: 'bmw' })));
    await waitFor(() => expect(result.current.searchQuery).toBe('bmw'));
  });
});
