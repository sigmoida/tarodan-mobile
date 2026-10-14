/**
 * Üretici çipi kaldırılınca (C3 inceleme 6): üreticiye bağlı grup seçimleri düşer,
 * genel gruplar (Nadirlik vb.) kalır. Filtre sayfası, arama sekmesi ve Tüm ilanlar
 * çipi aynı `keepGeneralAttributeSelections` kuralını kullanır.
 */
import React from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { makeTestQueryClient } from '@/test-utils';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-router', () => require('@/test-utils/router-mock').routerMock);
jest.mock('@/lib/api', () => ({
  productsApi: { getAll: jest.fn(async () => ({ data: { items: [], meta: { page: 1, totalPages: 1, total: 0 } } })) },
  searchApi: { autocompleteRich: jest.fn() },
}));

jest.mock('@/hooks/useProductFilterOptions', () => ({
  useProductFilterOptions: () => ({
    manufacturers: [{ id: 'm1', name: 'Hot Wheels', slug: 'hot-wheels' }],
    brands: [],
    categories: [],
    scales: [],
    materials: [],
    customAttributes: [
      { slug: 'rarity', name: 'Nadirlik', manufacturerSlug: null, attributes: [] },
      { slug: 'segment', name: 'Segment', manufacturerSlug: 'hot-wheels', attributes: [] },
    ],
    isLoading: false,
  }),
}));

import { useSearch } from '../_hooks/useSearch';

describe('arama sekmesi · üretici çipi kaldırma', () => {
  it('üreticiye bağlı seçim düşer, genel grup seçimi kalır', () => {
    const queryClient = makeTestQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useSearch(), { wrapper });

    act(() =>
      result.current.setFilters((prev: any) => ({
        ...prev,
        manufacturer: 'Hot Wheels',
        manufacturerId: 'm1',
        customAttributes: { rarity: ['rare'], segment: ['premium'] },
      })),
    );
    const chip = result.current.activeChips.find((c: { key: string }) => c.key === 'manuf')!;
    expect(chip).toBeTruthy();

    act(() => chip.onRemove());

    expect(result.current.filters.manufacturer).toBe('');
    expect(result.current.filters.manufacturerId).toBe('');
    expect(result.current.filters.customAttributes).toEqual({ rarity: ['rare'] });
  });
});
