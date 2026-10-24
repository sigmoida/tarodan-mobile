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
    brands: [{ id: 'b1', name: 'Ferrari', slug: 'ferrari' }],
    categories: [],
    carModels: [{ id: 'cm1', name: 'F40', slug: 'f40', brandId: 'b1' }],
    scales: [],
    materials: [],
    colors: [
      { slug: 'red', label: 'Kırmızı', color: 'swatch-red' },
      { slug: 'black', label: 'Siyah', color: null },
    ],
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

  it('ön filtreli giriş (focus yok) klavyeyi açmaz; yalnız üst bar araması (focus=1) odaklanır', () => {
    expect(renderSearch({ tradeOnly: 'true' }).result.current.autoFocusSearch).toBe(false);
    expect(renderSearch({ focus: '1' }).result.current.autoFocusSearch).toBe(true);
  });

  it('yalnız kimlikle gelen kategori de kaldırılabilir çip olur (genel etiket)', () => {
    const { result } = renderSearch({ categoryId: 'c-unknown' });
    const chip = result.current.activeChips.find((c) => c.key === 'cat')!;
    expect(chip).toBeTruthy();
    act(() => chip.onRemove());
    expect(result.current.filters.categoryId).toBe('');
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

  describe('web URL parity filters', () => {
    it('web URL with color, pre-order and car model: results request, chips and count match', async () => {
      const { result } = renderSearch({ color: 'red,black', preOrder: 'true', carModelId: 'cm1' });
      await waitFor(() =>
        expect(getAll).toHaveBeenCalledWith(
          expect.objectContaining({ color: 'red,black', preOrder: true, carModelId: 'cm1' }),
        ),
      );
      // Names come from the option lists when the URL carries ids/slugs only.
      expect(result.current.activeChips.map((c) => [c.key, c.label])).toEqual([
        ['model', 'F40'],
        ['color:red', 'Kırmızı'],
        ['color:black', 'Siyah'],
        ['preOrder', 'Ön Sipariş'],
      ]);
      expect(result.current.activeFiltersCount).toBe(3);
    });

    it('a saved-search URL (ids + display names, free text as "search") filters by the ids', async () => {
      const { result } = renderSearch({
        search: 'ferrari',
        brandId: 'b1',
        brand: 'Ferrari',
        carModelId: 'cm1',
        carModel: 'F40',
        limited: 'true',
        set: 'true',
        sortBy: 'view_count_asc',
      });
      expect(result.current.filters.search).toBe('ferrari');
      await waitFor(() =>
        expect(getAll).toHaveBeenCalledWith(
          expect.objectContaining({
            search: 'ferrari',
            brandId: 'b1',
            carModelId: 'cm1',
            limited: true,
            set: true,
            sortBy: 'view_count_asc',
          }),
        ),
      );
      const request = getAll.mock.calls.at(-1)![0];
      expect(request).not.toHaveProperty('brand');
      expect(request).not.toHaveProperty('carModel');
      expect(result.current.activeChips.map((c) => c.label)).toEqual(['Ferrari', 'F40', 'Limited Edition', 'Setler']);
    });

    it('chips remove one at a time; Clear resets the new filters', () => {
      const { result } = renderSearch({ color: 'red,black', set: 'true', carModelId: 'cm1', carModel: 'F40' });
      act(() => result.current.activeChips.find((c) => c.key === 'color:red')!.onRemove());
      expect(result.current.filters.colors).toEqual(['black']);
      act(() => result.current.activeChips.find((c) => c.key === 'set')!.onRemove());
      expect(result.current.filters.set).toBe(false);
      act(() => result.current.clearAllFilters());
      expect(result.current.filters).toMatchObject({ colors: [], carModelId: '', carModel: '', set: false });
      expect(result.current.activeFiltersCount).toBe(0);
    });

    it('a suggested brand drops the car model of the previous brand; other facets keep it', () => {
      const { result } = renderSearch({ brandId: 'b1', brand: 'Ferrari', carModelId: 'cm1', carModel: 'F40' });
      act(() => result.current.applyFacet({ categoryId: 'c1', category: 'Diecast' }));
      expect(result.current.filters).toMatchObject({ categoryId: 'c1', carModelId: 'cm1', carModel: 'F40' });
      act(() => result.current.applyFacet({ brandId: 'b2', brand: 'Lamborghini' }));
      expect(result.current.filters).toMatchObject({ brandId: 'b2', brand: 'Lamborghini', carModelId: '', carModel: '' });
    });
  });
});
