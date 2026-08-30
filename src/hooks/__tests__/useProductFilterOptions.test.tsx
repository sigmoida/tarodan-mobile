/**
 * P2 #13 — `GET /products/filters` boş `scales` döndürebilir.
 *
 * Sunucu 16'lık sabit fallback'ini kaldırdı; `scales: []` artık MEŞRU bir
 * yanıt ve "katalogda ölçek yok" demek. Mobil ise boş yanıtı görünce 5 elemanlı
 * bir İSTEMCİ listesi koyuyordu — kullanıcı katalogda karşılığı olmayan bir
 * ölçekle filtreleyip sıfır sonuç alıyordu. Uydurulmuş seçenek, boş listeden
 * daha kötüdür.
 *
 * Ayrım önemli: sunucu CEVAP VERDİ ve boş (→ boş göster) ile CEVAP GELMEDİ
 * (yükleniyor/hata) aynı şey değil.
 */
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('@/lib/api', () => ({
  productsApi: { getFilters: jest.fn() },
  catalogApi: { getCategories: jest.fn(() => Promise.resolve([])) },
}));

import { productsApi } from '@/lib/api';
import { useProductFilterOptions } from '../useProductFilterOptions';

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

const filters = (over: Record<string, unknown> = {}) => ({
  data: {
    categories: [],
    brands: [],
    manufacturers: [],
    carModels: [],
    scales: [],
    materials: [],
    customAttributes: [],
    ...over,
  },
});

describe('useProductFilterOptions · boş scales toleransı', () => {
  beforeEach(() => {
    (productsApi.getFilters as jest.Mock).mockReset();
  });

  it('sunucu boş scales döndürünce istemci listesi UYDURMAZ', async () => {
    (productsApi.getFilters as jest.Mock).mockResolvedValue(filters());

    const { result } = renderHook(() => useProductFilterOptions(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.scales).toEqual([]);
  });

  it('sunucu dolu döndürünce onu aynen kullanır', async () => {
    (productsApi.getFilters as jest.Mock).mockResolvedValue(filters({ scales: ['1:18', '1:64'] }));

    const { result } = renderHook(() => useProductFilterOptions(), { wrapper });

    await waitFor(() => expect(result.current.scales).toEqual(['1:18', '1:64']));
  });

  it('malzemede de aynı kural geçerli', async () => {
    (productsApi.getFilters as jest.Mock).mockResolvedValue(filters());

    const { result } = renderHook(() => useProductFilterOptions(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.materials).toEqual([]);
  });
});
