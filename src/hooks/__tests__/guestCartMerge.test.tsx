/**
 * Misafir sepeti → giriş: misafirken eklenen satırlar sunucuya HİÇ gitmez; girişte
 * `useCartMergeOnLogin` sunucuda olmayanları BİR KEZ gönderir (kopya yok), sunucuda zaten olanlara
 * dokunmaz; yeniden render / aynı oturum ikinci gönderim üretmez.
 */
import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@/lib/api', () => ({
  cartApi: {
    get: jest.fn(),
    addItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
  },
}));
const mockAuth: { isAuthenticated: boolean; user: { id: string } | null } = {
  isAuthenticated: false,
  user: null,
};
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (s: any) => unknown) => (sel ? sel(mockAuth) : mockAuth),
}));

import { cartApi } from '@/lib/api';
import { useCartStore } from '@/stores/cartStore';
import { useCartSync } from '../useCartSync';
import { useCartMergeOnLogin } from '../useServerCart';

const line = (productId: string) => ({
  productId,
  title: productId,
  price: 10,
  stock: 5,
  imageUrl: 'http://x/i.png',
  seller: { id: 's1', displayName: 'Satıcı' },
});

const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
);

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.isAuthenticated = false;
  mockAuth.user = null;
  useCartStore.setState({ items: [], buyNowItem: null, deselectedIds: [] } as any);
});

it('misafir ekler → girişte eksik satırlar bir kez sunucuya taşınır', async () => {
  const sync = renderHook(() => useCartSync(), { wrapper });
  act(() => {
    sync.result.current.add(line('p1'), 2);
    sync.result.current.add(line('p2'));
  });
  // Misafir: sunucuya hiçbir şey gitmez.
  expect(cartApi.addItem).not.toHaveBeenCalled();

  // Sunucu sepetinde p2 zaten var (başka cihaz) → yalnız p1 gönderilmeli.
  (cartApi.get as jest.Mock).mockResolvedValue({
    data: { data: { calculation: { items: [{ productId: 'p2', quantity: 1 }] } } },
  });
  const merge = renderHook(() => useCartMergeOnLogin(), { wrapper });
  mockAuth.isAuthenticated = true;
  mockAuth.user = { id: 'u1' };
  merge.rerender({});

  await waitFor(() => expect(cartApi.addItem).toHaveBeenCalledTimes(1));
  expect(cartApi.addItem).toHaveBeenCalledWith('p1', 2);

  // Aynı oturumda yeniden render → ikinci birleştirme yok (kopya satır üretmez).
  merge.rerender({});
  merge.rerender({});
  await act(async () => {
    await Promise.resolve();
  });
  expect(cartApi.get).toHaveBeenCalledTimes(1);
  expect(cartApi.addItem).toHaveBeenCalledTimes(1);
  // Yerel sepet korunur.
  expect(useCartStore.getState().items.map((i) => i.productId)).toEqual(['p1', 'p2']);
});

it('misafir sepeti boşsa girişte sunucuya istek atılmaz', async () => {
  const merge = renderHook(() => useCartMergeOnLogin(), { wrapper });
  mockAuth.isAuthenticated = true;
  mockAuth.user = { id: 'u1' };
  merge.rerender({});
  await act(async () => {
    await Promise.resolve();
  });
  expect(cartApi.get).not.toHaveBeenCalled();
  expect(cartApi.addItem).not.toHaveBeenCalled();
});
