/**
 * Ortak favori akışı (ürün detayı + ürün kartı): misafir → uyarı + giriş; ekle/çıkar + toast;
 * çift dokunmada tek istek; kartta kendi ilanına kalp yok; toggle kimliği sabit.
 */
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { toast } from '@/ui';

jest.mock('@/lib/api', () => ({
  wishlistApi: {
    get: jest.fn(),
    add: jest.fn(),
    remove: jest.fn(),
    clear: jest.fn(),
  },
}));

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (...a: unknown[]) => mockPush(...a) } }));

type MockAuth = { isAuthenticated: boolean; user: { id: string } | null };
let mockAuth: MockAuth = { isAuthenticated: true, user: { id: 'me' } };
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (state: MockAuth) => unknown) => (sel ? sel(mockAuth) : mockAuth),
}));

import { wishlistApi } from '@/lib/api';
import { useFavoriteToggle, useProductCardFavorites, isOwnProduct } from '../useFavoriteToggle';

const wishlist = wishlistApi as unknown as { get: jest.Mock; add: jest.Mock; remove: jest.Mock };

// Test başına TEK client (wrapper her render'da çağrılır; içinde `new` cache'i sıfırlardı).
let client: QueryClient;
function wrapper({ children }: { children: React.ReactElement }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const srv = (productId: string) => ({ id: `w-${productId}`, productId, productTitle: 'Ürün', productPrice: 10 });

let success: jest.SpyInstance;
let error: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  mockAuth = { isAuthenticated: true, user: { id: 'me' } };
  wishlist.get.mockResolvedValue({ data: { items: [] } });
  wishlist.add.mockResolvedValue({ data: {} });
  wishlist.remove.mockResolvedValue({ data: {} });
  success = jest.spyOn(toast, 'success').mockImplementation(() => 1);
  error = jest.spyOn(toast, 'error').mockImplementation(() => 1);
});

async function setupToggle() {
  const view = renderHook(() => useFavoriteToggle(), { wrapper });
  await waitFor(() => expect(wishlist.get).toHaveBeenCalled());
  return view;
}

describe('useFavoriteToggle', () => {
  it('misafir: uyarı + giriş ekranı, istek yok', async () => {
    jest.useFakeTimers();
    try {
      mockAuth = { isAuthenticated: false, user: null };
      const { result } = renderHook(() => useFavoriteToggle(), { wrapper });
      let r: unknown;
      await act(async () => {
        r = await result.current.toggle('p1');
      });
      expect(r).toBe('signin');
      expect(error).toHaveBeenCalledWith('Favorilere eklemek için üye olun');
      expect(wishlist.add).not.toHaveBeenCalled();
      act(() => jest.advanceTimersByTime(1500));
      expect(mockPush).toHaveBeenCalledWith('/(auth)/login');
    } finally {
      jest.useRealTimers();
    }
  });

  it('favoride değilse ekler (kalp hemen dolar) + başarı toast', async () => {
    const { result } = await setupToggle();
    wishlist.get.mockResolvedValue({ data: { items: [srv('p1')] } });
    let r: unknown;
    await act(async () => {
      r = await result.current.toggle('p1');
    });
    expect(r).toBe('added');
    expect(wishlist.add).toHaveBeenCalledWith('p1');
    expect(success).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(result.current.favoriteIds.has('p1')).toBe(true));
  });

  it('favorideyse çıkarır', async () => {
    wishlist.get.mockResolvedValue({ data: { items: [srv('p1')] } });
    const { result } = await setupToggle();
    await waitFor(() => expect(result.current.favoriteIds.has('p1')).toBe(true));
    let r: unknown;
    await act(async () => {
      r = await result.current.toggle('p1');
    });
    expect(r).toBe('removed');
    expect(wishlist.remove).toHaveBeenCalledWith('p1');
    // React Query gözlemci bildirimi bir sonraki tick'te gelir.
    await waitFor(() => expect(result.current.favoriteIds.has('p1')).toBe(false));
  });

  it('işlem sürerken aynı ürüne ikinci dokunuş istek göndermez', async () => {
    const { result } = await setupToggle();
    let release!: () => void;
    wishlist.add.mockReturnValue(new Promise((res) => (release = () => res({ data: {} }))));
    let first!: Promise<unknown>;
    let second: unknown;
    await act(async () => {
      first = result.current.toggle('p1');
      second = await result.current.toggle('p1');
    });
    expect(second).toBe('busy');
    await act(async () => {
      release();
      await first;
    });
    expect(wishlist.add).toHaveBeenCalledTimes(1);
  });

  it('başarısız eklemede geri alınır + hata toast', async () => {
    const { result } = await setupToggle();
    wishlist.add.mockRejectedValue({ response: { status: 500 } });
    let r: unknown;
    await act(async () => {
      r = await result.current.toggle('p1');
    });
    expect(r).toBe('failed');
    expect(error).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(result.current.favoriteIds.has('p1')).toBe(false));
  });

  it('toggle ve refetch kimliği render\'lar arasında sabit (effect/memo bağımlılığı olabilir)', async () => {
    const { result, rerender } = await setupToggle();
    const { toggle, refetch } = result.current;
    rerender({});
    expect(result.current.toggle).toBe(toggle);
    expect(result.current.refetch).toBe(refetch);
  });
});

describe('useProductCardFavorites', () => {
  it('kendi ilanında kalp yok; başkasınınkinde durum + sabit toggle', async () => {
    wishlist.get.mockResolvedValue({ data: { items: [srv('p2')] } });
    const { result } = renderHook(() => useProductCardFavorites(), { wrapper });
    await waitFor(() => expect(result.current({ id: 'p2' }).isFavorite).toBe(true));
    expect(result.current({ id: 'p1', sellerId: 'me' })).toEqual({});
    expect(result.current({ id: 'p1', seller: { id: 'me' } })).toEqual({});
    const other = result.current({ id: 'p3', sellerId: 'someone' });
    expect(other.isFavorite).toBe(false);
    expect(other.onToggleFavorite).toBe(result.current({ id: 'p2' }).onToggleFavorite);
  });

  it('misafire de kalp gösterilir (basınca giriş akışı)', () => {
    mockAuth = { isAuthenticated: false, user: null };
    const { result } = renderHook(() => useProductCardFavorites(), { wrapper });
    const props = result.current({ id: 'p1', sellerId: 'x' });
    expect(props.isFavorite).toBe(false);
    expect(typeof props.onToggleFavorite).toBe('function');
  });

  it('isOwnProduct: kullanıcı yoksa ya da satıcı bilinmiyorsa false', () => {
    expect(isOwnProduct({ id: 'p', sellerId: 'me' }, null)).toBe(false);
    expect(isOwnProduct({ id: 'p' }, 'me')).toBe(false);
    expect(isOwnProduct({ id: 'p', sellerId: 'me' }, 'me')).toBe(true);
  });
});
