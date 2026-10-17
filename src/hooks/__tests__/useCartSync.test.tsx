/**
 * Sepete ekleme SESSİZCE reddedilebiliyordu.
 *
 * `useCartSync` satırı önce yerel store'a yazıp sunucuya aynalıyor; aynalama
 * hatası yalnız Sentry'ye gidiyordu. Sonuç: sunucu ürünü reddetse bile
 * (askıya alınmış satıcı, satışa uygun olmayan ürün, stok…) satır sepette
 * kalıyor ve iki çağıran da "Sepete eklendi" diyor. Kullanıcı satın alınamaz
 * bir ürünü sepetinde satın alınabilir görüyor.
 *
 * Ayrım önemli: **4xx** sunucunun bu satırı reddettiği anlamına gelir ve
 * kalıcıdır → geri al + söyle. **5xx/ağ** geçicidir → iyimser satır kalsın,
 * kullanıcıyı çevrimdışıyken sepetinden etmeyelim.
 */
import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { appAlert, toast } from '@/ui';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@/lib/api', () => ({
  cartApi: {
    get: jest.fn(),
    addItem: jest.fn(),
    removeItem: jest.fn(() => Promise.resolve()),
    updateItem: jest.fn(() => Promise.resolve()),
    clear: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (s: any) => unknown) => {
    // `useCartMergeOnLogin` kullanıcı kimliğine bakıyor (oturum başına bir kez).
    const state: any = { isAuthenticated: true, user: { id: 'u1' } };
    return sel ? sel(state) : state;
  },
}));

import { cartApi } from '@/lib/api';
import { useCartStore } from '@/stores/cartStore';
import { useCartSync } from '../useCartSync';
import { useCartMergeOnLogin } from '../useServerCart';

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

const ITEM = {
  productId: 'p1',
  title: 'Test Model',
  price: 100,
  imageUrl: 'http://x/i.png',
  seller: { id: 's1', displayName: 'Satıcı' },
} as any;

const rejectWith = (status: number, message?: string) =>
  (cartApi.addItem as jest.Mock).mockRejectedValue({
    response: { status, data: message ? { message } : {} },
  });

describe('useCartSync · sunucu eklemeyi reddederse', () => {
  let toastError: jest.SpyInstance;
  beforeEach(() => {
    (cartApi.addItem as jest.Mock).mockReset();
    (appAlert as jest.Mock).mockClear();
    toastError = jest.spyOn(toast, 'error').mockImplementation(() => 1);
    useCartStore.setState({ items: [], deselectedIds: [], mergePendingFor: null });
  });
  afterEach(() => toastError.mockRestore());

  it.each([401, 403, 408, 429])(
    '%i GEÇİCİDİR (oturum / hız sınırı): satır KORUNUR, uyarı yok, birleştirme bekliyor işaretlenir',
    async (status) => {
      rejectWith(status, 'Çok fazla istek');
      const { result } = renderHook(() => useCartSync(), { wrapper });

      act(() => result.current.add(ITEM));

      await waitFor(() => expect(useCartStore.getState().mergePendingFor).toBe('u1'));
      expect(useCartStore.getState().items).toHaveLength(1);
      expect(toastError).not.toHaveBeenCalled();
    },
  );

  it('4xx: iyimser satır GERİ ALINIR', async () => {
    rejectWith(409, 'Bu satıcı şu an satış yapamıyor');
    const { result } = renderHook(() => useCartSync(), { wrapper });

    act(() => result.current.add(ITEM));
    expect(useCartStore.getState().items).toHaveLength(1);

    await waitFor(() => expect(useCartStore.getState().items).toHaveLength(0));
  });

  it('4xx: sunucunun mesajı kullanıcıya gösterilir', async () => {
    rejectWith(409, 'Bu satıcı şu an satış yapamıyor');
    const { result } = renderHook(() => useCartSync(), { wrapper });

    act(() => result.current.add(ITEM));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith('Bu satıcı şu an satış yapamıyor'));
  });

  it('4xx mesajsız gelse de kullanıcı bilgilendirilir', async () => {
    rejectWith(400);
    const { result } = renderHook(() => useCartSync(), { wrapper });

    act(() => result.current.add(ITEM));

    await waitFor(() => expect(toastError).toHaveBeenCalled());
    await waitFor(() => expect(useCartStore.getState().items).toHaveLength(0));
  });

  it('5xx/ağ hatası GEÇİCİDİR: satır sepette kalır, uyarı çıkmaz', async () => {
    rejectWith(503);
    const { result } = renderHook(() => useCartSync(), { wrapper });

    act(() => result.current.add(ITEM));

    // Reddin işlenmesi için bir tur bekle.
    await act(async () => {
      await Promise.resolve();
    });
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(toastError).not.toHaveBeenCalled();
    expect(appAlert).not.toHaveBeenCalled();
  });

  it('zaten sepette olan satırda 4xx: satır silinmez, ÖNCEKİ adede döner', async () => {
    (cartApi.addItem as jest.Mock).mockResolvedValue({ data: {} });
    const { result } = renderHook(() => useCartSync(), { wrapper });
    act(() => result.current.add(ITEM));
    await waitFor(() => expect(useCartStore.getState().items).toHaveLength(1));

    rejectWith(400, 'Stok yetersiz');
    act(() => result.current.add(ITEM));
    expect(useCartStore.getState().items[0]!.quantity).toBe(2);

    await waitFor(() => expect(useCartStore.getState().items[0]!.quantity).toBe(1));
    expect(useCartStore.getState().items).toHaveLength(1);
  });
});

/**
 * Aynı sessizlik ikinci bir yerde daha vardı: giriş sonrası yerel sepeti
 * sunucuya taşıyan birleştirme, her satırı `.catch(() => {})` ile deniyordu.
 * Sunucu bir satırı reddederse (satışa uygun değil, askıda satıcı…) yerel satır
 * HAYALET olarak kalıyordu — sunucuda karşılığı yok, checkout'ta patlıyor.
 *
 * Burada uyarı ÇIKARILMAZ: bu, kullanıcının tetiklemediği bir arka plan
 * uzlaştırması; açılışta modal basmak yerine satırı düşürmek doğru olan.
 */
describe('useCartMergeOnLogin · sunucu satırı reddederse', () => {
  beforeEach(() => {
    (cartApi.addItem as jest.Mock).mockReset();
    (cartApi.get as jest.Mock).mockReset().mockResolvedValue({ data: { calculation: { items: [] } } });
    (appAlert as jest.Mock).mockClear();
    // Giriş geçişi: misafir satırları bu kullanıcı için birleştirme bekliyor.
    useCartStore.setState({ items: [], deselectedIds: [], mergePendingFor: null });
    useCartStore.getState().addItem(ITEM);
    useCartStore.getState().markMergePending('u1');
  });

  it('4xx: hayalet satır yerelden DÜŞER, birleştirme biter', async () => {
    (cartApi.addItem as jest.Mock).mockRejectedValue({ response: { status: 400 } });

    renderHook(() => useCartMergeOnLogin(), { wrapper });

    await waitFor(() => expect(useCartStore.getState().items).toHaveLength(0));
    await waitFor(() => expect(useCartStore.getState().mergePendingFor).toBeNull());
    expect(appAlert).not.toHaveBeenCalled();
  });

  it.each([503, 401, 403, 408, 429])(
    '%i: satır KORUNUR ve birleştirme bekliyor kalır (geçici hata sepeti boşaltmaz)',
    async (status) => {
      (cartApi.addItem as jest.Mock).mockRejectedValue({ response: { status } });

      renderHook(() => useCartMergeOnLogin(), { wrapper });

      await waitFor(() => expect(cartApi.addItem).toHaveBeenCalled());
      await act(async () => {
        await Promise.resolve();
      });
      expect(useCartStore.getState().items).toHaveLength(1);
      expect(useCartStore.getState().mergePendingFor).toBe('u1');
    },
  );

  it('sunucu sepeti okunamazsa (429) satırlar korunur, birleştirme bekliyor kalır', async () => {
    (cartApi.get as jest.Mock).mockReset().mockRejectedValue({ response: { status: 429 } });

    renderHook(() => useCartMergeOnLogin(), { wrapper });

    await waitFor(() => expect(cartApi.get).toHaveBeenCalled());
    await act(async () => {
      await Promise.resolve();
    });
    expect(cartApi.addItem).not.toHaveBeenCalled();
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().mergePendingFor).toBe('u1');
  });

  it('hesap düzeyinde kesin 403 (EMAIL_NOT_VERIFIED): birleştirme durur, satırlar KALIR, yeniden deneme yok', async () => {
    (cartApi.addItem as jest.Mock).mockRejectedValue({
      response: { status: 403, data: { errorCode: 'EMAIL_NOT_VERIFIED' } },
    });

    renderHook(() => useCartMergeOnLogin(), { wrapper });

    await waitFor(() => expect(useCartStore.getState().mergePendingFor).toBeNull());
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(cartApi.addItem).toHaveBeenCalledTimes(1);
  });

  it('IP engeli (server.security.accessBlocked) da hesap düzeyinde kesindir', async () => {
    (cartApi.get as jest.Mock).mockReset().mockRejectedValue({
      response: { status: 403, data: { i18nKey: 'server.security.accessBlocked' } },
    });

    renderHook(() => useCartMergeOnLogin(), { wrapper });

    await waitFor(() => expect(useCartStore.getState().mergePendingFor).toBeNull());
    expect(useCartStore.getState().items).toHaveLength(1);
  });

  it('satıra özgü 403: o satır atlanır (yerelde kalır), kalan satırlarla devam edilir', async () => {
    useCartStore.getState().addItem({ ...ITEM, productId: 'p2', title: 'İkinci' });
    (cartApi.addItem as jest.Mock).mockImplementation((productId: string) =>
      productId === 'p1'
        ? Promise.reject({ response: { status: 403, data: { code: 'SELLER_SALES_SUSPENDED', productId } } })
        : Promise.resolve({ data: {} }),
    );

    renderHook(() => useCartMergeOnLogin(), { wrapper });

    await waitFor(() => expect(useCartStore.getState().mergePendingFor).toBeNull());
    expect(cartApi.addItem).toHaveBeenCalledWith('p2', 1);
    expect(useCartStore.getState().items.map((i) => i.productId)).toEqual(['p1', 'p2']);
  });

  it('soğuk açılış (işaret yok): birleştirme ÇALIŞMAZ', async () => {
    useCartStore.setState({ mergePendingFor: null });

    renderHook(() => useCartMergeOnLogin(), { wrapper });

    await act(async () => {
      await Promise.resolve();
    });
    expect(cartApi.get).not.toHaveBeenCalled();
    expect(cartApi.addItem).not.toHaveBeenCalled();
  });

  it('başarı: işaret kalkar', async () => {
    (cartApi.addItem as jest.Mock).mockResolvedValue({ data: {} });

    renderHook(() => useCartMergeOnLogin(), { wrapper });

    await waitFor(() => expect(useCartStore.getState().mergePendingFor).toBeNull());
    expect(cartApi.addItem).toHaveBeenCalledWith('p1', 1);
    expect(useCartStore.getState().items).toHaveLength(1);
  });
});
