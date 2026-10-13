/**
 * Adet seçici → sepet: store stok/sipariş tavanında sessizce kırpar; sunucuya ham istenen adet değil,
 * store'un GERÇEKTEN eklediği fark gider (yerel/sunucu ayrışmasın). Fark 0 ise sunucu çağrısı yok.
 */
import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@/lib/api', () => ({
  cartApi: {
    addItem: jest.fn(() => Promise.resolve({ data: {} })),
    removeItem: jest.fn(() => Promise.resolve()),
    updateItem: jest.fn(() => Promise.resolve()),
    clear: jest.fn(() => Promise.resolve()),
  },
}));
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (s: any) => unknown) => {
    const state: any = { isAuthenticated: true, user: { id: 'u1' } };
    return sel ? sel(state) : state;
  },
}));

import { cartApi } from '@/lib/api';
import { useCartStore } from '@/stores/cartStore';
import { useCartSync } from '../useCartSync';
import { cartQuantityLimit, clampCartQuantity } from '../../../app/product/[id]/_lib/quantity';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

const item = (over: Record<string, unknown> = {}) =>
  ({ productId: 'p1', title: 'T', price: 10, imageUrl: 'x', seller: { id: 's', displayName: 'S' }, ...over }) as any;

describe('useCartSync.add · sunucuya gerçek fark', () => {
  beforeEach(() => {
    (cartApi.addItem as jest.Mock).mockClear();
    useCartStore.setState({ items: [], deselectedIds: [] });
  });

  it('yeni satır: istenen adet tavan altındaysa o adet gider', () => {
    const { result } = renderHook(() => useCartSync(), { wrapper });
    act(() => result.current.add(item({ stock: 10 }), 3));
    expect(useCartStore.getState().items[0]!.quantity).toBe(3);
    expect(cartApi.addItem).toHaveBeenCalledWith('p1', 3);
  });

  it('yeni satır: sipariş başına tavana kırpılırsa sunucuya kırpılan adet gider', () => {
    const { result } = renderHook(() => useCartSync(), { wrapper });
    act(() => result.current.add(item({ stock: 10, maxQuantityPerOrder: 2 }), 5));
    expect(useCartStore.getState().items[0]!.quantity).toBe(2);
    expect(cartApi.addItem).toHaveBeenCalledWith('p1', 2);
  });

  it('mevcut satır: yalnız eklenen fark gider', () => {
    const { result } = renderHook(() => useCartSync(), { wrapper });
    act(() => result.current.add(item({ stock: 5 }), 3));
    (cartApi.addItem as jest.Mock).mockClear();
    act(() => result.current.add(item({ stock: 5 }), 4)); // 3 + 4 → tavan 5, fark 2
    expect(useCartStore.getState().items[0]!.quantity).toBe(5);
    expect(cartApi.addItem).toHaveBeenCalledTimes(1);
    expect(cartApi.addItem).toHaveBeenCalledWith('p1', 2);
  });

  it('zaten tavandaysa fark 0: sunucu çağrısı yok', () => {
    const { result } = renderHook(() => useCartSync(), { wrapper });
    act(() => result.current.add(item({ stock: 2 }), 2));
    (cartApi.addItem as jest.Mock).mockClear();
    act(() => result.current.add(item({ stock: 2 }), 1));
    expect(useCartStore.getState().items[0]!.quantity).toBe(2);
    expect(cartApi.addItem).not.toHaveBeenCalled();
  });

  it('tek adet (varsayılan) eskisi gibi 1 gönderir', () => {
    const { result } = renderHook(() => useCartSync(), { wrapper });
    act(() => result.current.add(item()));
    expect(cartApi.addItem).toHaveBeenCalledWith('p1', 1);
  });
});

describe('ürün detayı adet tavanı (store kuralıyla tek kaynak)', () => {
  const base = { id: 'p1', title: 'T', status: 'active', availableQuantity: 8 } as any;

  it('stok ∧ maxQuantityPerOrder ∧ web 20', () => {
    expect(cartQuantityLimit(base, false)).toBe(8);
    expect(cartQuantityLimit({ ...base, maxQuantityPerOrder: 3 }, false)).toBe(3);
    expect(cartQuantityLimit({ ...base, availableQuantity: 50 }, false)).toBe(20);
  });

  it('seçici yok: sahip, aktif değil, tek stok', () => {
    expect(cartQuantityLimit(base, true)).toBeNull();
    expect(cartQuantityLimit({ ...base, status: 'sold' }, false)).toBeNull();
    expect(cartQuantityLimit({ ...base, availableQuantity: 1 }, false)).toBeNull();
  });

  it('clamp: tıklama anında tavana, en az 1', () => {
    expect(clampCartQuantity(9, { ...base, maxQuantityPerOrder: 3 }, false)).toBe(3);
    expect(clampCartQuantity(0, base, false)).toBe(1);
    expect(clampCartQuantity(5, { ...base, availableQuantity: 1 }, false)).toBe(1);
  });
});
