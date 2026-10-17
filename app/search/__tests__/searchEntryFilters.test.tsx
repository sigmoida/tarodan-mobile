/**
 * Ön filtreli açılış (ana sayfa "Tümünü gör", kategori kutusu, eski /listings bağlantısı):
 * filtreler URL'den kurulur, API isteğine girer, kaldırılabilir çip olur; klavye açılmaz.
 * Yalnız adla gelen üretici kimliğe çözülür (eski /listings davranışı aramaya taşındı).
 */
import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { makeTestQueryClient } from '@/test-utils';

const mockParams: { current: Record<string, string> } = { current: {} };
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => mockParams.current,
}));
jest.mock('@/lib/api', () => ({
  productsApi: { getAll: jest.fn(async () => ({ data: { items: [], meta: { page: 1, totalPages: 1, total: 0 } } })) },
  searchApi: { autocompleteRich: jest.fn(), users: jest.fn() },
}));
jest.mock('@/hooks/useProductFilterOptions', () => ({
  useProductFilterOptions: () => ({
    manufacturers: [{ id: 'm1', name: 'Hot Wheels', slug: 'hot-wheels' }],
    brands: [],
    categories: [],
    scales: [],
    materials: [],
    customAttributes: [],
    isLoading: false,
  }),
}));

import { productsApi } from '@/lib/api';
import { useSearch } from '../_hooks/useSearch';

function renderSearch(params: Record<string, string>) {
  mockParams.current = params;
  const queryClient = makeTestQueryClient();
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => useSearch(), { wrapper });
}

const getAll = productsApi.getAll as jest.Mock;

describe('arama · ön filtreli açılış', () => {
  beforeEach(() => getAll.mockClear());

  it('takas vitrini: tradeOnly API isteğine girer, çip görünür ve kaldırılabilir', async () => {
    const { result } = renderSearch({ tradeOnly: 'true' });
    expect(result.current.filters.tradeOnly).toBe(true);
    await waitFor(() => expect(getAll).toHaveBeenCalledWith(expect.objectContaining({ tradeOnly: true })));
    const chip = result.current.activeChips.find((c) => c.key === 'trade')!;
    expect(chip).toBeTruthy();
    act(() => chip.onRemove());
    expect(result.current.filters.tradeOnly).toBe(false);
    expect(result.current.activeChips).toEqual([]);
  });

  it('popüler: sortBy=view_count_desc ile istek; metin yok', async () => {
    const { result } = renderSearch({ sortBy: 'view_count_desc' });
    expect(result.current.filters).toMatchObject({ sortBy: 'view_count_desc', search: '' });
    await waitFor(() =>
      expect(getAll).toHaveBeenCalledWith(expect.objectContaining({ sortBy: 'view_count_desc' })),
    );
  });

  it('filtreyle açılışta focus=1 gelse de klavye odaklanmaz; filtresiz focus=1 odaklanır', () => {
    expect(renderSearch({ focus: '1', discountOnly: 'true' }).result.current.autoFocusSearch).toBe(false);
    expect(renderSearch({ focus: '1', sortBy: 'created_desc' }).result.current.autoFocusSearch).toBe(false);
    expect(renderSearch({ focus: '1' }).result.current.autoFocusSearch).toBe(true);
    expect(renderSearch({ tradeOnly: 'true' }).result.current.autoFocusSearch).toBe(false);
  });

  it('yalnız adla gelen üretici kimliğe çözülür; istek kimlikle atılır (ad-only istek yok)', async () => {
    const { result } = renderSearch({ manufacturer: 'Hot Wheels' });
    await waitFor(() => expect(result.current.filters.manufacturerId).toBe('m1'));
    await waitFor(() =>
      expect(getAll).toHaveBeenCalledWith(expect.objectContaining({ manufacturerId: 'm1' })),
    );
    expect(getAll).not.toHaveBeenCalledWith(expect.objectContaining({ manufacturer: 'Hot Wheels' }));
    expect(result.current.activeChips.map((c) => c.label)).toEqual(['Hot Wheels']);
  });
});
