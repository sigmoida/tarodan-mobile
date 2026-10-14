/**
 * Regresyon: seçili ölçek (ve diğer filtreler) gezinmeler arasında KALICI değildir — ilanlar
 * filtreleri yalnız o açılışın URL parametrelerinden yerel state'e kurar (store yok).
 */
import React from 'react';
import { act, renderHook } from '@testing-library/react-native';
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
jest.mock('@/lib/api', () => ({
  productsApi: {
    getAll: jest.fn(() =>
      Promise.resolve({ data: { data: [], meta: { total: 0, page: 1, limit: 24, totalPages: 1 } } }),
    ),
  },
}));

import { useLocalSearchParams } from 'expo-router';
import { useListings } from '../_hooks/useListings';

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

describe('ilanlar filtreleri — gezinmeler arası kalıcı değil', () => {
  it('ölçek parametresiyle açılan sayfadan sonra parametresiz açılış ölçeksiz başlar', () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ scale: '1:64' });
    const first = renderHook(() => useListings(), { wrapper });
    expect(first.result.current.filters.scale).toBe('1:64');
    // Sayfada başka ölçek seçilse de…
    act(() => first.result.current.setFilters((prev) => ({ ...prev, scale: '1:43' })));
    first.unmount();

    (useLocalSearchParams as jest.Mock).mockReturnValue({});
    const second = renderHook(() => useListings(), { wrapper });
    expect(second.result.current.filters.scale).toBe('');
    expect(second.result.current.activeFilterCount).toBe(0);
    second.unmount();
  });
});
