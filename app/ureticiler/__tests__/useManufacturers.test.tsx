/**
 * Üreticiler listesi ve anasayfa şeridi — ilanı olmayan üretici gösterilmez (web ile aynı karar).
 * İki hook aynı `qk.catalog.manufacturers` önbelleğini paylaşır; süzgeç `select`'te, önbellek ham.
 */
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { makeTestQueryClient } from '@/test-utils';

const mockManufacturers = [
  { id: 'm1', name: 'Hot Wheels', slug: 'hot-wheels', _count: { products: 12 } },
  { id: 'm2', name: 'Bburago', slug: 'bburago', _count: { products: 0 } },
  { id: 'm3', name: 'Tomica', slug: 'tomica' },
];

jest.mock('@/lib/api', () => ({
  manufacturersApi: { findAll: jest.fn(async () => ({ data: { data: mockManufacturers } })) },
  productsApi: {
    getAll: jest.fn(async () => ({ data: { data: [] } })),
    getPopular: jest.fn(async () => ({ data: { data: [] } })),
  },
  userApi: {
    getTopCollections: jest.fn(async () => ({ data: { data: [] } })),
    getFeaturedCollector: jest.fn(async () => ({ data: null })),
    getFeaturedBusiness: jest.fn(async () => ({ data: null })),
  },
}));

import { useManufacturers } from '../_hooks/useManufacturers';
import { useHomeData } from '../../(tabs)/_hooks/useHomeData';

const wrapperFor = () => {
  const client = makeTestQueryClient();
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
};

describe('ilanı olmayan üretici gizlenir', () => {
  it('Üreticiler ekranı: yalnız ilanı olanlar', async () => {
    const { result } = renderHook(() => useManufacturers(), { wrapper: wrapperFor() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.items.map((m) => m.id)).toEqual(['m1']);
    expect(result.current.hasAny).toBe(true);
  });

  it('anasayfa marka şeridi: yalnız ilanı olanlar', async () => {
    const { result } = renderHook(() => useHomeData(), { wrapper: wrapperFor() });
    await waitFor(() => expect(result.current.manufacturers).toHaveLength(1));
    expect(result.current.manufacturers[0].id).toBe('m1');
  });
});
