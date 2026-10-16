/**
 * Ortak favori akışı (ürün detayı + ürün kartı): misafir → tek uyarı + tek giriş yönlendirmesi
 * (odak dışındaysa yok); liste gelmeden dokunuş yok sayılır; ekle/çıkar + toast + detay beğeni ±1;
 * çift dokunmada tek istek; hızlı ekle/çıkar yarışında tek tazeleme; çıkışta uçuştaki yazım eski
 * kullanıcının öğesini geri yazmaz; kartta kendi ilanına kalp yok; toggle kimliği sabit.
 */
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationContext } from '@react-navigation/native';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { toast } from '@/ui';
import { qk } from '@/lib/query';

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
  useAuthStore: Object.assign(
    (sel?: (state: MockAuth) => unknown) => (sel ? sel(mockAuth) : mockAuth),
    { getState: () => mockAuth },
  ),
}));

import { wishlistApi } from '@/lib/api';
import {
  useFavoriteToggle,
  useProductCardFavorites,
  isOwnProduct,
  resetFavoriteToggleStateForTests,
  SIGN_IN_REDIRECT_MS,
} from '../useFavoriteToggle';

const wishlist = wishlistApi as unknown as { get: jest.Mock; add: jest.Mock; remove: jest.Mock };

// Test başına TEK client (wrapper her render'da çağrılır; içinde `new` cache'i sıfırlardı).
let client: QueryClient;
let navigation: { isFocused: () => boolean } | undefined;
function wrapper({ children }: { children: React.ReactElement }) {
  const inner = <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return navigation ? (
    // Yalnız `isFocused` okunur; tam navigasyon nesnesi gerekmez.
    <NavigationContext.Provider value={navigation as React.ContextType<typeof NavigationContext>}>
      {inner}
    </NavigationContext.Provider>
  ) : (
    inner
  );
}

const srv = (productId: string) => ({ id: `w-${productId}`, productId, productTitle: 'Ürün', productPrice: 10 });

/** Elle çözülen söz: isteği "uçuşta" tutmak için. */
function deferred<T = unknown>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

let success: jest.SpyInstance;
let error: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  resetFavoriteToggleStateForTests();
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  navigation = undefined;
  mockAuth = { isAuthenticated: true, user: { id: 'me' } };
  wishlist.get.mockResolvedValue({ data: { items: [] } });
  wishlist.add.mockResolvedValue({ data: {} });
  wishlist.remove.mockResolvedValue({ data: {} });
  success = jest.spyOn(toast, 'success').mockImplementation(() => 1);
  error = jest.spyOn(toast, 'error').mockImplementation(() => 1);
});

async function setupToggle() {
  const view = renderHook(() => useFavoriteToggle(), { wrapper });
  await waitFor(() => expect(client.getQueryData(qk.favorites.all)).toBeDefined());
  return view;
}

describe('useFavoriteToggle · misafir', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockAuth = { isAuthenticated: false, user: null };
  });
  afterEach(() => jest.useRealTimers());

  it('art arda dokunuşta TEK uyarı + TEK giriş yönlendirmesi, istek yok', async () => {
    const { result } = renderHook(() => useFavoriteToggle(), { wrapper });
    const results: unknown[] = [];
    await act(async () => {
      results.push(await result.current.toggle('p1'));
      results.push(await result.current.toggle('p2'));
      results.push(await result.current.toggle('p1'));
    });
    expect(results).toEqual(['signin', 'signin', 'signin']);
    expect(error).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith('Favorilere eklemek için üye olun');
    expect(wishlist.add).not.toHaveBeenCalled();
    act(() => jest.advanceTimersByTime(SIGN_IN_REDIRECT_MS));
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/(auth)/login');
  });

  it('ekran bu arada odaktan çıktıysa giriş ekranı itilmez', async () => {
    let focused = true;
    navigation = { isFocused: () => focused };
    const { result } = renderHook(() => useFavoriteToggle(), { wrapper });
    await act(async () => {
      await result.current.toggle('p1');
    });
    focused = false;
    act(() => jest.advanceTimersByTime(SIGN_IN_REDIRECT_MS));
    expect(mockPush).not.toHaveBeenCalled();
    // Bekleyen yönlendirme bitti: yeni dokunuş yeniden uyarır.
    await act(async () => {
      await result.current.toggle('p1');
    });
    expect(error).toHaveBeenCalledTimes(2);
  });
});

describe('useFavoriteToggle · giriş yapmış', () => {
  it('favori listesi gelmeden dokunuş yok sayılır (favorideki ürün yeniden eklenmesin)', async () => {
    wishlist.get.mockReturnValue(new Promise(() => undefined));
    const { result } = renderHook(() => useFavoriteToggle(), { wrapper });
    let r: unknown;
    await act(async () => {
      r = await result.current.toggle('p1');
    });
    expect(r).toBe('busy');
    expect(wishlist.add).not.toHaveBeenCalled();
    expect(wishlist.remove).not.toHaveBeenCalled();
  });

  it('favoride değilse ekler + başarı toast; detay cache\'i varsa beğeni +1 (refetch yok)', async () => {
    const { result } = await setupToggle();
    client.setQueryData(qk.products.detail('p1'), { id: 'p1', likeCount: 3 });
    wishlist.get.mockResolvedValue({ data: { items: [srv('p1')] } });
    let r: unknown;
    await act(async () => {
      r = await result.current.toggle('p1');
    });
    expect(r).toBe('added');
    expect(wishlist.add).toHaveBeenCalledWith('p1');
    expect(success).toHaveBeenCalledTimes(1);
    expect(client.getQueryData<{ likeCount: number }>(qk.products.detail('p1'))!.likeCount).toBe(4);
    await waitFor(() => expect(result.current.favoriteIds.has('p1')).toBe(true));
  });

  it('favorideyse çıkarır; detay beğenisi -1 (sıfırın altına inmez)', async () => {
    wishlist.get.mockResolvedValue({ data: { items: [srv('p1')] } });
    const { result } = await setupToggle();
    client.setQueryData(qk.products.detail('p1'), { id: 'p1', likeCount: 0 });
    await waitFor(() => expect(result.current.favoriteIds.has('p1')).toBe(true));
    wishlist.get.mockResolvedValue({ data: { items: [] } });
    let r: unknown;
    await act(async () => {
      r = await result.current.toggle('p1');
    });
    expect(r).toBe('removed');
    expect(wishlist.remove).toHaveBeenCalledWith('p1');
    expect(client.getQueryData<{ likeCount: number }>(qk.products.detail('p1'))!.likeCount).toBe(0);
    await waitFor(() => expect(result.current.favoriteIds.has('p1')).toBe(false));
  });

  it('sayı kimliği de eşleşir (isInFavorites ile favoriteIds aynı karşılaştırma)', async () => {
    wishlist.get.mockResolvedValue({ data: { items: [{ id: 'w', productId: 7 }] } });
    const { result } = await setupToggle();
    await waitFor(() => expect(result.current.favoriteIds.has('7')).toBe(true));
    await act(async () => {
      await result.current.toggle('7');
    });
    expect(wishlist.remove).toHaveBeenCalledWith('7');
    expect(wishlist.add).not.toHaveBeenCalled();
  });

  it('işlem sürerken aynı ürüne ikinci dokunuş istek göndermez', async () => {
    const { result } = await setupToggle();
    const add = deferred();
    wishlist.add.mockReturnValue(add.promise);
    let first!: Promise<unknown>;
    let second: unknown;
    await act(async () => {
      first = result.current.toggle('p1');
      second = await result.current.toggle('p1');
    });
    expect(second).toBe('busy');
    await act(async () => {
      add.resolve({ data: {} });
      await first;
    });
    expect(wishlist.add).toHaveBeenCalledTimes(1);
  });

  it('hızlı "A ekle / B çıkar": A bitince tazeleme YOK, ikisi bitince TEK tazeleme; B geri gelmez', async () => {
    wishlist.get.mockResolvedValue({ data: { items: [srv('B')] } });
    const { result } = await setupToggle();
    await waitFor(() => expect(result.current.favoriteIds.has('B')).toBe(true));
    const getCalls = wishlist.get.mock.calls.length;
    const add = deferred();
    const remove = deferred();
    wishlist.add.mockReturnValue(add.promise);
    wishlist.remove.mockReturnValue(remove.promise);
    let a!: Promise<unknown>;
    let b!: Promise<unknown>;
    await act(async () => {
      a = result.current.toggle('A');
      b = result.current.toggle('B');
    });
    // Sunucu A eklendikten sonra (B henüz silinmemişken) eski listeyi döndürebilirdi.
    wishlist.get.mockResolvedValue({ data: { items: [srv('B'), srv('A')] } });
    await act(async () => {
      add.resolve({ data: {} });
      await a;
    });
    expect(wishlist.get.mock.calls.length).toBe(getCalls);
    await waitFor(() => expect(result.current.favoriteIds.has('B')).toBe(false));
    expect(result.current.favoriteIds.has('A')).toBe(true);
    wishlist.get.mockResolvedValue({ data: { items: [srv('A')] } });
    await act(async () => {
      remove.resolve({ data: {} });
      await b;
    });
    await waitFor(() => expect(wishlist.get.mock.calls.length).toBe(getCalls + 1));
    await waitFor(() => expect([...result.current.favoriteIds]).toEqual(['A']));
  });

  it('süren tazeleme iyimser yazımdan önce iptal edilir (eski liste kalbi geri çevirmez)', async () => {
    const { result } = await setupToggle();
    const stale = deferred<{ data: { items: unknown[] } }>();
    wishlist.get.mockReturnValueOnce(stale.promise);
    act(() => {
      void client.refetchQueries({ queryKey: qk.favorites.all });
    });
    wishlist.get.mockResolvedValue({ data: { items: [srv('p1')] } });
    await act(async () => {
      await result.current.toggle('p1');
    });
    // İptal edilen eski yanıt (boş liste) sonradan gelse de cache'e yazılmaz.
    await act(async () => {
      stale.resolve({ data: { items: [] } });
    });
    await waitFor(() => expect(result.current.favoriteIds.has('p1')).toBe(true));
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

  it('çıkış sırasında uçuştaki yazım: eski kullanıcının öğesini geri yazmaz, tazeleme/toast yok', async () => {
    wishlist.get.mockResolvedValue({ data: { items: [srv('p1')] } });
    const { result } = await setupToggle();
    await waitFor(() => expect(result.current.favoriteIds.has('p1')).toBe(true));
    const remove = deferred();
    wishlist.remove.mockReturnValue(remove.promise);
    let pending!: Promise<unknown>;
    await act(async () => {
      pending = result.current.toggle('p1');
    });
    // Çıkış: kullanıcı düşer, `resetUserStores` cache'i temizler.
    mockAuth = { isAuthenticated: false, user: null };
    act(() => client.clear());
    const getCalls = wishlist.get.mock.calls.length;
    let r: unknown;
    await act(async () => {
      remove.reject({ response: { status: 500 } });
      r = await pending;
    });
    expect(r).toBe('failed');
    expect(client.getQueryData(qk.favorites.all)).toBeUndefined();
    expect(wishlist.get.mock.calls.length).toBe(getCalls);
    expect(error).not.toHaveBeenCalled();
    expect(success).not.toHaveBeenCalled();
  });

  it('toggle kimliği render\'lar arasında sabit', async () => {
    const { result, rerender } = await setupToggle();
    const { toggle } = result.current;
    rerender({});
    expect(result.current.toggle).toBe(toggle);
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
