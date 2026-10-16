/**
 * URL'de yalnız üretici ADI varsa (derin bağlantı, push, hero, reklam) `useListings`
 * yüklenen üretici listesinden kimliği çözer ve `manufacturerId` gönderir; liste yüklenirken
 * ilk istek bekletilir (önce ad, sonra kimlikle iki istek atılmaz).
 */
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('expo-router', () => ({ useLocalSearchParams: jest.fn(() => ({})) }));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

let mockOptions: {
  manufacturers: { id: string; name: string; slug: string }[];
  isLoading: boolean;
};
jest.mock('@/hooks/useProductFilterOptions', () => ({
  useProductFilterOptions: () => ({
    categories: [],
    brands: [],
    manufacturers: mockOptions.manufacturers,
    scales: [],
    materials: [],
    customAttributes: [],
    isLoading: mockOptions.isLoading,
  }),
}));
jest.mock('@/lib/api', () => ({ productsApi: { getAll: jest.fn() } }));

import { useLocalSearchParams } from 'expo-router';
import { productsApi } from '@/lib/api';
import { useListings } from '../_hooks/useListings';

const getAll = productsApi.getAll as jest.Mock;
const params = useLocalSearchParams as jest.Mock;

const HW = { id: 'm-hw', name: 'Hot Wheels', slug: 'hot-wheels' };

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

beforeEach(() => {
  getAll.mockReset();
  getAll.mockResolvedValue({ data: { data: [], meta: { total: 0, page: 1, limit: 24, totalPages: 1 } } });
  mockOptions = { manufacturers: [HW], isLoading: false };
});

it('yalnız ad varsa kimlik çözülür ve istek manufacturerId ile atılır (tek istek)', async () => {
  params.mockReturnValue({ manufacturer: 'Hot Wheels' });
  const { result } = renderHook(() => useListings(), { wrapper });

  await waitFor(() => expect(result.current.filters.manufacturerId).toBe('m-hw'));
  await waitFor(() => expect(getAll).toHaveBeenCalled());
  expect(getAll.mock.calls.every(([p]) => p.manufacturerId === 'm-hw')).toBe(true);
});

it('üretici listesi yüklenirken sorgu bekletilir, yükleniyor görünür', async () => {
  params.mockReturnValue({ manufacturer: 'Hot Wheels' });
  mockOptions = { manufacturers: [], isLoading: true };
  const { result } = renderHook(() => useListings(), { wrapper });

  expect(result.current.isLoading).toBe(true);
  expect(getAll).not.toHaveBeenCalled();
});

it('ad listede yoksa ad ile devam eder (kimlik eklenmez)', async () => {
  params.mockReturnValue({ manufacturer: 'Maisto' });
  const { result } = renderHook(() => useListings(), { wrapper });

  await waitFor(() => expect(getAll).toHaveBeenCalled());
  expect(result.current.filters.manufacturerId).toBe('');
  expect(getAll.mock.calls[0][0]).toMatchObject({ manufacturer: 'Maisto' });
  expect(getAll.mock.calls[0][0].manufacturerId).toBeUndefined();
});

it('URL zaten manufacturerId taşıyorsa dokunulmaz', async () => {
  params.mockReturnValue({ manufacturer: 'Hot Wheels', manufacturerId: 'zzz' });
  const { result } = renderHook(() => useListings(), { wrapper });

  await waitFor(() => expect(getAll).toHaveBeenCalled());
  expect(result.current.filters.manufacturerId).toBe('zzz');
});
