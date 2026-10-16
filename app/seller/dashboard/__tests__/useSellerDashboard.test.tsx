/**
 * Satıcı paneli · yükleyici ÜÇ sorgu da çözülene dek kalır (eskiden `&&`: ilk gelen sorgu
 * yükleyiciyi kaldırıp kartları 0 ile çizdiriyordu); çekip-yenile göstergesi yalnız kullanıcı
 * çektiğinde ve üç istek bitene dek döner.
 */
import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { makeTestQueryClient } from '@/test-utils';

jest.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({ user: { membershipTier: 'basic' }, isAuthenticated: true }),
}));
jest.mock('@/lib/api', () => ({
  userApi: { getAnalytics: jest.fn(), getStats: jest.fn() },
  ordersApi: { getAll: jest.fn() },
  productsApi: { getMyStats: jest.fn(), getMyListings: jest.fn() },
}));

import { ordersApi, productsApi, userApi } from '@/lib/api';
import { useSellerDashboard } from '../_hooks/useSellerDashboard';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={makeTestQueryClient()}>{children}</QueryClientProvider>
);

/** Elle çözülen istek: testin hangi sorgunun ne zaman bittiğini seçmesi için. */
function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

beforeEach(() => {
  jest.clearAllMocks();
  (productsApi.getMyStats as jest.Mock).mockResolvedValue({ data: { counts: { active: 3 } } });
  (userApi.getAnalytics as jest.Mock).mockResolvedValue({ data: { pendingOrders: 1 } });
});

it('yükleyici üç sorgu da gelene dek kalır', async () => {
  const orders = deferred<unknown>();
  (ordersApi.getAll as jest.Mock).mockReturnValue(orders.promise);
  (productsApi.getMyListings as jest.Mock).mockResolvedValue({ data: [{ id: 'p1' }] });

  const { result } = renderHook(() => useSellerDashboard(), { wrapper });
  // İstatistik ve ilan sayısı geldi, bekleyen siparişler gelmedi → hâlâ yükleniyor.
  await waitFor(() => expect(result.current.activeListings).toBe(1));
  expect(result.current.isLoading).toBe(true);

  await act(async () => {
    orders.resolve({ data: [{ id: 'o1' }, { id: 'o2' }] });
  });
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current.pendingOrders).toBe(2);
});

it('çekip-yenile göstergesi üç istek bitene dek döner', async () => {
  (ordersApi.getAll as jest.Mock).mockResolvedValue({ data: [] });
  (productsApi.getMyListings as jest.Mock).mockResolvedValue({ data: [] });
  const { result } = renderHook(() => useSellerDashboard(), { wrapper });
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current.refreshing).toBe(false);

  const listings = deferred<unknown>();
  (productsApi.getMyListings as jest.Mock).mockReturnValue(listings.promise);
  let pending: Promise<void> | undefined;
  act(() => {
    pending = result.current.refresh();
  });
  expect(result.current.refreshing).toBe(true);
  await act(async () => {
    listings.resolve({ data: [] });
    await pending;
  });
  expect(result.current.refreshing).toBe(false);
});
