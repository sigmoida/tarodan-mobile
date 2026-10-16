/**
 * İlanlar · çekip-yenile ve hata durumu.
 * - Gösterge YALNIZ kullanıcı çektiğinde döner: sıralama değişimi (keepPreviousData ile arka planda
 *   yeniden çekme) göstergeyi döndürmez.
 * - Çekip-yenile yüklü tüm sayfaları değil yalnız İLK sayfayı çeker (tek istek).
 * - Yükleme hatası boş durumla maskelenmez: `isError` → ekran ErrorState.
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

import { productsApi } from '@/lib/api';
import { useListings } from '../_hooks/useListings';

const getAll = productsApi.getAll as jest.Mock;
const TOTAL = 30;
const LIMIT = 24;

function serve(params: { page?: number }) {
  const page = params.page ?? 1;
  const ids = Array.from({ length: TOTAL }, (_, i) => `p${i + 1}`);
  const data = ids.slice((page - 1) * LIMIT, page * LIMIT).map((id) => ({ id, title: id }));
  return Promise.resolve({
    data: { data, meta: { total: TOTAL, page, limit: LIMIT, totalPages: Math.ceil(TOTAL / LIMIT) } },
  });
}

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

beforeEach(() => {
  getAll.mockReset();
});

describe('useListings · çekip-yenile', () => {
  it('sıralama değişimi göstergeyi döndürmez; çekip-yenile yalnız ilk sayfayı çeker', async () => {
    getAll.mockImplementation(serve);
    const { result } = renderHook(() => useListings(), { wrapper });
    await waitFor(() => expect(result.current.listings.length).toBe(LIMIT));
    await waitFor(() => expect(result.current.isFetching).toBe(false));
    await act(async () => {
      await result.current.fetchNextPage();
    });
    await waitFor(() => expect(result.current.listings.length).toBe(TOTAL));

    // Sıralama değişimi: yeni anahtar arka planda çekilir, gösterge kapalı kalır.
    act(() => result.current.setSortBy('price_desc'));
    expect(result.current.refreshing).toBe(false);
    await waitFor(() => expect(result.current.isFetching).toBe(false));
    expect(result.current.refreshing).toBe(false);
    await act(async () => {
      await result.current.fetchNextPage();
    });
    await waitFor(() => expect(result.current.listings.length).toBe(TOTAL));

    getAll.mockClear();
    let pending: Promise<void> | undefined;
    act(() => {
      pending = result.current.refreshFirstPage();
    });
    expect(result.current.refreshing).toBe(true);
    await act(async () => {
      await pending;
    });
    expect(result.current.refreshing).toBe(false);
    // İki sayfa yüklüyken TEK istek (ilk sayfa); önbellek ilk sayfaya kırpıldı.
    expect(getAll).toHaveBeenCalledTimes(1);
    expect(getAll.mock.calls[0][0]).toEqual(expect.objectContaining({ page: 1 }));
    await waitFor(() => expect(result.current.listings.length).toBe(LIMIT));
  });

  it('yükleme hatasında isError true (ekran ErrorState gösterir), ilan listesi boş', async () => {
    getAll.mockRejectedValue(new Error('500'));
    const { result } = renderHook(() => useListings(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.listings).toEqual([]);
    expect(result.current.isLoading).toBe(false);

    // Yeniden dene başarılı → hata kalkar.
    getAll.mockImplementation(serve);
    await act(async () => {
      await result.current.refetch();
    });
    await waitFor(() => expect(result.current.isError).toBe(false));
    await waitFor(() => expect(result.current.listings.length).toBe(LIMIT));
  });
});
