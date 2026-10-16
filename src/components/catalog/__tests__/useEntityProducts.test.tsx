/**
 * Üretici / marka detayı — ürünler 24'lük sayfalarla gelir (sonsuz kaydırma). Eskiden sayfasız
 * tek istek atılıyor, sunucunun varsayılan sayfasından sonrası hiç görünmüyordu.
 */
import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { makeTestQueryClient } from '@/test-utils';

jest.mock('@/lib/api', () => ({
  brandsApi: { findBySlug: jest.fn() },
  manufacturersApi: { findBySlug: jest.fn() },
  productsApi: { getAll: jest.fn() },
}));

import { manufacturersApi, productsApi } from '@/lib/api';
import { ENTITY_PAGE_SIZE, useEntityProducts } from '../useEntityProducts';

const getAll = productsApi.getAll as jest.Mock;
const findBySlug = manufacturersApi.findBySlug as jest.Mock;

const page = (ids: string[], p: number, totalPages: number) => ({
  data: {
    data: ids.map((id) => ({ id, title: id, price: 1, images: [] })),
    meta: { page: p, limit: ENTITY_PAGE_SIZE, total: 30, totalPages },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={makeTestQueryClient()}>{children}</QueryClientProvider>
);

describe('useEntityProducts · sayfalama', () => {
  beforeEach(() => {
    getAll.mockReset();
    findBySlug.mockReset();
    findBySlug.mockResolvedValue({ data: { data: { id: 'm1', name: 'Hot Wheels', slug: 'hot-wheels' } } });
  });

  it('ilk sayfa limit 24 ile istenir; loadMore ikinci sayfayı ekler, son sayfada durur', async () => {
    getAll
      .mockResolvedValueOnce(page(['p1', 'p2'], 1, 2))
      .mockResolvedValueOnce(page(['p3'], 2, 2));

    const { result } = renderHook(() => useEntityProducts('manufacturer', 'hot-wheels'), { wrapper });

    await waitFor(() => expect(result.current.products).toHaveLength(2));
    expect(getAll).toHaveBeenCalledWith({
      manufacturerId: 'm1',
      status: 'active',
      page: 1,
      limit: ENTITY_PAGE_SIZE,
    });

    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.products.map((p) => p.id)).toEqual(['p1', 'p2', 'p3']));
    expect(getAll).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2, limit: ENTITY_PAGE_SIZE }));

    act(() => result.current.loadMore());
    expect(getAll).toHaveBeenCalledTimes(2);
  });

  it('sonraki sayfa hatası yüklü ızgarayı silmez; kaydırma değil "Tekrar dene" satırı yeniden dener', async () => {
    getAll
      .mockResolvedValueOnce(page(['p1', 'p2'], 1, 2))
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(page(['p3'], 2, 2));

    const { result } = renderHook(() => useEntityProducts('manufacturer', 'hot-wheels'), { wrapper });
    await waitFor(() => expect(result.current.products).toHaveLength(2));

    act(() => result.current.loadMore());
    await waitFor(() => expect(getAll).toHaveBeenCalledTimes(2));
    // Hata durumunu doğrudan bekle: `loadingMore=false` istek "yükleniyor"a geçmeden önceki
    // render'da da sağlanır (yarış) — o anda hata henüz yoktu.
    await waitFor(() => expect(result.current.loadMoreFailed).toBe(true));
    expect(result.current.loadingMore).toBe(false);
    expect(result.current.products).toHaveLength(2);
    expect(result.current.error).toBeNull();

    // Sayfa hatasında kaydırma otomatik yeniden denemez (liste altında "Tekrar dene" satırı var).
    act(() => result.current.loadMore());
    expect(getAll).toHaveBeenCalledTimes(2);

    act(() => result.current.retryLoadMore());
    await waitFor(() => expect(result.current.products.map((p) => p.id)).toEqual(['p1', 'p2', 'p3']));
  });

  it('ilk sayfa hatası (ürün yok) → error dolu (tam ekran ErrorState)', async () => {
    getAll.mockRejectedValueOnce(new Error('boom'));
    const { result } = renderHook(() => useEntityProducts('manufacturer', 'hot-wheels'), { wrapper });
    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.products).toHaveLength(0);
  });

  it('meta yoksa (eski yanıt) tek sayfa sayılır', async () => {
    getAll.mockResolvedValueOnce({ data: { data: [{ id: 'p1', title: 'x', price: 1, images: [] }] } });
    const { result } = renderHook(() => useEntityProducts('manufacturer', 'hot-wheels'), { wrapper });

    await waitFor(() => expect(result.current.products).toHaveLength(1));
    act(() => result.current.loadMore());
    expect(getAll).toHaveBeenCalledTimes(1);
  });

  it('iç içe zarf `{ data: { products } }` da okunur', async () => {
    getAll.mockResolvedValueOnce({ data: { data: { products: [{ id: 'p9', title: 'x', price: 1, images: [] }] } } });
    const { result } = renderHook(() => useEntityProducts('manufacturer', 'hot-wheels'), { wrapper });

    await waitFor(() => expect(result.current.products.map((p) => p.id)).toEqual(['p9']));
  });
});
