/**
 * Ana sayfa üretici şeridi `qk.catalog.manufacturers` anahtarını Üreticiler / Kategoriler ekranlarıyla
 * paylaşır: uç düşerse hata `[]` olarak "başarılı" önbelleğe yazılmaz (diğer ekranlar hatayı görsün).
 */
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { makeTestQueryClient } from '@/test-utils';
import { qk } from '@/lib/query';

const mockFindAll = jest.fn();
jest.mock('@/lib/api', () => ({
  manufacturersApi: { findAll: () => mockFindAll() },
  productsApi: { getAll: () => Promise.resolve({ data: [] }), getPopular: () => Promise.resolve({ data: [] }) },
  userApi: new Proxy({}, { get: () => () => Promise.resolve({ data: [] }) }),
}));

import { useHomeData } from '../_hooks/useHomeData';

describe('useHomeData — üretici şeridi', () => {
  it('uç düşünce sorgu HATA verir (boş liste olarak önbelleğe yazılmaz)', async () => {
    mockFindAll.mockRejectedValue(new Error('boom'));
    const client = makeTestQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    renderHook(() => useHomeData(), { wrapper });
    await waitFor(() => expect(client.getQueryState(qk.catalog.manufacturers)?.status).toBe('error'));
    expect(client.getQueryData(qk.catalog.manufacturers)).toBeUndefined();
  });

  it('{ data: [...] } sarmalını açar; ilanı olmayan elenir', async () => {
    mockFindAll.mockResolvedValue({
      data: { data: [{ id: 'm1', name: 'A', _count: { products: 2 } }, { id: 'm2', name: 'B', _count: { products: 0 } }] },
    });
    const client = makeTestQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useHomeData(), { wrapper });
    await waitFor(() => expect(result.current.manufacturers).toHaveLength(1));
    expect(result.current.manufacturers[0]!.name).toBe('A');
  });
});
