/**
 * Kategoriler ekranının veri kaynakları: kategori ağacı + üreticiler (ilanı olmayan elenir; Üreticiler
 * ekranıyla aynı sorgu anahtarı) + ölçekler. Durum kaynak başına; GET /categories TEK istek.
 */
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { makeTestQueryClient } from '@/test-utils';

const mockCategories = jest.fn();
const mockManufacturers = jest.fn();
const mockFilters = jest.fn();
jest.mock('@/lib/api', () => ({
  categoriesApi: { getAll: () => mockCategories() },
  manufacturersApi: { findAll: () => mockManufacturers() },
  productsApi: { getFilters: () => mockFilters() },
}));

import { useCategoriesCatalog } from '../_hooks/useCategoriesCatalog';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={makeTestQueryClient()}>{children}</QueryClientProvider>
);

const filtersOk = () => Promise.resolve({ data: { scales: ['1:64'], categories: [], brands: [], manufacturers: [] } });

beforeEach(() => {
  mockCategories.mockReset();
  mockManufacturers.mockReset();
  mockFilters.mockReset();
  mockFilters.mockImplementation(filtersOk);
});

describe('useCategoriesCatalog', () => {
  it('üç kaynağı birleştirir; ilanı olmayan üretici elenir; { data } sarmalını açar; GET /categories bir kez', async () => {
    mockCategories.mockResolvedValue({ data: [{ id: 'c1', name: 'Otomobil', productCount: 2, children: [] }] });
    mockManufacturers.mockResolvedValue({
      data: { data: [{ id: 'm1', name: 'A', _count: { products: 2 } }, { id: 'm2', name: 'B', _count: { products: 0 } }] },
    });
    const { result } = renderHook(() => useCategoriesCatalog(), { wrapper });
    await waitFor(() => expect(result.current.scales).toEqual(['1:64']));
    expect(result.current.categories.map((c) => c.name)).toEqual(['Otomobil']);
    expect(result.current.manufacturers.map((m) => m.name)).toEqual(['A']);
    expect(result.current.status).toEqual({ categories: 'ready', manufacturers: 'ready', scales: 'ready' });
    expect(result.current.isLoading).toBe(false);
    // Filtre seçenekleri hook'u da kategori ağacına ihtiyaç duyar: aynı anahtar → tek istek.
    expect(mockCategories).toHaveBeenCalledTimes(1);
  });

  it('tam ekran iskelet /products/filters yanıtını beklemez (yalnız kategori + üretici)', async () => {
    mockCategories.mockResolvedValue({ data: [{ id: 'c1', name: 'Otomobil', productCount: 1 }] });
    mockManufacturers.mockResolvedValue({ data: [{ id: 'm1', name: 'A', _count: { products: 2 } }] });
    mockFilters.mockImplementation(() => new Promise(() => undefined));
    const { result } = renderHook(() => useCategoriesCatalog(), { wrapper });
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.status.scales).toBe('loading');
  });

  it('kaynak başına durum: biri düşerse yalnız o `error`; retry yalnız o kaynağı yeniden çeker', async () => {
    mockCategories.mockRejectedValue(new Error('boom'));
    mockManufacturers.mockResolvedValue({ data: [{ id: 'm1', name: 'A', _count: { products: 2 } }] });
    const { result } = renderHook(() => useCategoriesCatalog(), { wrapper });
    await waitFor(() => expect(result.current.status.categories).toBe('error'));
    expect(result.current.status.manufacturers).toBe('ready');
    const calls = mockCategories.mock.calls.length;
    const mfCalls = mockManufacturers.mock.calls.length;
    result.current.retry.categories();
    await waitFor(() => expect(mockCategories.mock.calls.length).toBeGreaterThan(calls));
    expect(mockManufacturers.mock.calls.length).toBe(mfCalls);
  });

  it('ölçek sorgusu düşerse `scales` grubu error (sessizce boş kalmaz)', async () => {
    mockCategories.mockResolvedValue({ data: [] });
    mockManufacturers.mockResolvedValue({ data: [] });
    mockFilters.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useCategoriesCatalog(), { wrapper });
    await waitFor(() => expect(result.current.status.scales).toBe('error'));
  });
});
