/**
 * Kategoriler ekranının veri kaynakları: kategori ağacı + üreticiler (ilanı olmayan elenir; Üreticiler
 * ekranıyla aynı sorgu anahtarı) + ölçekler. `error` yalnız dinamik kaynakların hepsi başarısızsa.
 */
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { makeTestQueryClient } from '@/test-utils';

const mockCategories = jest.fn();
const mockManufacturers = jest.fn();
jest.mock('@/lib/api', () => ({
  categoriesApi: { getAll: () => mockCategories() },
  manufacturersApi: { findAll: () => mockManufacturers() },
  productsApi: { getFilters: () => Promise.resolve({ data: { scales: ['1:64'], categories: [], brands: [], manufacturers: [] } }) },
}));

import { useCategoriesCatalog } from '../_hooks/useCategoriesCatalog';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={makeTestQueryClient()}>{children}</QueryClientProvider>
);

beforeEach(() => {
  mockCategories.mockReset();
  mockManufacturers.mockReset();
});

describe('useCategoriesCatalog', () => {
  it('üç kaynağı birleştirir; ilanı olmayan üretici elenir; { data } sarmalını açar', async () => {
    mockCategories.mockResolvedValue({ data: [{ id: 'c1', name: 'Otomobil', productCount: 2, children: [] }] });
    mockManufacturers.mockResolvedValue({
      data: { data: [{ id: 'm1', name: 'A', _count: { products: 2 } }, { id: 'm2', name: 'B', _count: { products: 0 } }] },
    });
    const { result } = renderHook(() => useCategoriesCatalog(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.categories.map((c) => c.name)).toEqual(['Otomobil']);
    expect(result.current.manufacturers.map((m) => m.name)).toEqual(['A']);
    expect(result.current.scales).toEqual(['1:64']);
    expect(result.current.error).toBeNull();
  });

  it('biri başarısızsa hata yok (diğer gruplar gösterilir); ikisi de başarısızsa hata', async () => {
    mockCategories.mockRejectedValue(new Error('boom'));
    mockManufacturers.mockResolvedValue({ data: [{ id: 'm1', name: 'A', _count: { products: 2 } }] });
    const one = renderHook(() => useCategoriesCatalog(), { wrapper });
    await waitFor(() => expect(one.result.current.isLoading).toBe(false));
    expect(one.result.current.error).toBeNull();
    expect(one.result.current.manufacturers).toHaveLength(1);
    one.unmount();

    mockManufacturers.mockRejectedValue(new Error('boom'));
    const both = renderHook(() => useCategoriesCatalog(), { wrapper });
    await waitFor(() => expect(both.result.current.error).not.toBeNull());
  });
});
