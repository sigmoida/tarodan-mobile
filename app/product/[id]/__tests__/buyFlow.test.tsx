/**
 * Ürün detayı sepet akışları (web paritesi):
 * - Misafir sepete ekleyebilir: giriş istenmez, yerel sepete yazılır, sunucuya gidilmez.
 * - "Hemen Al": ürün sepette değilse sepete eklenir, ödeme yalnız bu ürünle açılır (`?buyNow=1`);
 *   zaten sepetteyse ikinci kez eklenmez.
 * - Stokta yoksa ekleme/satın alma yok.
 */
import React from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from '@/ui';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/lib/api', () => ({
  cartApi: { addItem: jest.fn(() => Promise.resolve()), removeItem: jest.fn(() => Promise.resolve()) },
}));
let mockAuthed = false;
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (s: any) => unknown) => {
    const state: any = { isAuthenticated: mockAuthed, user: mockAuthed ? { id: 'u1' } : null };
    return sel ? sel(state) : state;
  },
}));

import { router } from 'expo-router';
import { cartApi } from '@/lib/api';
import { useCartStore } from '@/stores/cartStore';
import { useProductActions } from '../_hooks/useProductActions';

const PRODUCT = {
  id: 'p1',
  title: 'Model',
  price: 100,
  status: 'active',
  availableQuantity: 3,
  images: [],
  seller: { id: 's1', displayName: 'Satıcı' },
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

function setup(over: Partial<{ isOutOfStock: boolean; product: any }> = {}) {
  return renderHook(
    () =>
      useProductActions({
        product: over.product ?? PRODUCT,
        productId: 'p1',
        images: ['http://x/i.png'],
        isOutOfStock: over.isOutOfStock ?? false,
        isAuthenticated: mockAuthed,
        user: mockAuthed ? { id: 'u1' } : null,
      }),
    { wrapper },
  );
}

beforeEach(() => {
  mockAuthed = false;
  jest.clearAllMocks();
  useCartStore.setState({ items: [], buyNowItem: null, deselectedIds: [] } as any);
});

describe('misafir sepete ekleme', () => {
  it('giriş istemeden yerel sepete yazar; sunucuya gitmez; login ekranı açılmaz', () => {
    const success = jest.spyOn(toast, 'success');
    const { result } = setup();
    act(() => result.current.handleAddToCart());
    const items = useCartStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ productId: 'p1', quantity: 1, stock: 3 });
    expect(cartApi.addItem).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
    expect(success).toHaveBeenCalledWith('Ürün sepete eklendi!');
  });

  it('üyede aynı ekleme sunucuya aynalanır', () => {
    mockAuthed = true;
    const { result } = setup();
    act(() => result.current.handleAddToCart());
    expect(cartApi.addItem).toHaveBeenCalledWith('p1', 1);
  });

  it('stokta yoksa eklemez, hata toast', () => {
    const error = jest.spyOn(toast, 'error');
    const { result } = setup({ isOutOfStock: true });
    act(() => result.current.handleAddToCart());
    expect(useCartStore.getState().items).toHaveLength(0);
    expect(error).toHaveBeenCalled();
  });
});

describe('Hemen Al', () => {
  it('sepete ekler, yalnız bu ürünle ödemeye gider (misafir de)', () => {
    const { result } = setup();
    act(() => result.current.handleBuyNow());
    expect(useCartStore.getState().items.map((i) => i.productId)).toEqual(['p1']);
    expect(useCartStore.getState().buyNowItem).toMatchObject({ productId: 'p1', quantity: 1 });
    expect(router.push).toHaveBeenCalledWith('/checkout?buyNow=1');
  });

  it('ürün zaten sepetteyse ikinci kez eklemez (adet artmaz)', () => {
    const { result } = setup();
    act(() => result.current.handleAddToCart());
    act(() => result.current.handleBuyNow());
    const items = useCartStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(1);
    expect(router.push).toHaveBeenCalledWith('/checkout?buyNow=1');
  });

  it('ürün sepette 3 adetse ödenen adet sepet satırınınki (seçicideki 1 değil) — fazlası kaybolmaz', () => {
    const { result } = setup();
    act(() => result.current.setQuantity(3));
    act(() => result.current.handleAddToCart());
    act(() => result.current.setQuantity(1));
    act(() => result.current.handleBuyNow());
    expect(useCartStore.getState().items[0].quantity).toBe(3);
    expect(useCartStore.getState().buyNowItem?.quantity).toBe(3);
  });

  it('seçili adet taşınır (stok tavanında)', () => {
    const { result } = setup();
    act(() => result.current.setQuantity(2));
    act(() => result.current.handleBuyNow());
    expect(useCartStore.getState().buyNowItem?.quantity).toBe(2);
    expect(useCartStore.getState().items[0].quantity).toBe(2);
  });

  it('stokta yoksa ödemeye gitmez', () => {
    const { result } = setup({ isOutOfStock: true });
    act(() => result.current.handleBuyNow());
    expect(router.push).not.toHaveBeenCalled();
    expect(useCartStore.getState().buyNowItem).toBeNull();
  });

  it('"Sepete Git" sepet ekranını açar', () => {
    const { result } = setup();
    act(() => result.current.handleGoToCart());
    expect(router.push).toHaveBeenCalledWith('/cart');
  });
});
