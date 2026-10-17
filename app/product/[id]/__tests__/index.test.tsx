/**
 * Ürün detay (product/[id]) — kanonik refactor sonrası smoke/dilim testi.
 * Yükleniyor → ürün render (başlık/fiyat), bulunamadı durumu, alıcı aksiyonları.
 */
import React from 'react';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false) },
  useLocalSearchParams: () => ({ id: 'p1' }),
}));

// Geçiş sinyali testte elle sürülür (gerçek kanca `src/hooks/__tests__/useTransitionReady` altında).
let mockTransitionReady = true;
jest.mock('@/hooks/useTransitionReady', () => ({ useTransitionReady: () => mockTransitionReady }));

jest.mock('@/lib/api', () => ({
  productsApi: {
    getOne: jest.fn(),
    incrementView: jest.fn(() => Promise.resolve({ data: {} })),
    getMyById: jest.fn(),
    getSimilar: jest.fn(() => Promise.resolve({ data: [] })),
  },
  ratingsApi: { getProductRatings: jest.fn(() => Promise.resolve({ data: { ratings: [] } })) },
  userReportsApi: { create: jest.fn() },
}));
import { productsApi, ratingsApi } from '@/lib/api';
import { QueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/query';

// Ağır child modaller test kapsamı dışı — izole et (ekranı test ediyoruz, çocuklarını değil).
jest.mock('@/components/product/MakeOfferModal', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/product/AddToCollectionModal', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/SignupPrompt', () => ({ SignupPrompt: () => null }));

let mockAuth = { isAuthenticated: false, user: null as { id: string } | null };
jest.mock('@/stores/authStore', () => ({ useAuthStore: (sel?: (state: any) => unknown) => {
    const state: any = mockAuth ;
    return sel ? sel(state) : state;
  }}));
jest.mock('@/stores/cartStore', () => {
  const state = { items: [] as any[], addItem: jest.fn(), isInCart: () => false, setBuyNow: jest.fn() };
  // Selector'lü abonelik + `getState()` (useProductActions / useCartSync).
  const useCartStore: any = (sel?: (s: typeof state) => unknown) => (sel ? sel(state) : state);
  useCartStore.getState = () => state;
  return { useCartStore };
});
jest.mock('@/stores/guestStore', () => {
  const state = {
    incrementProductView: jest.fn(),
    getPromptType: () => null,
    setLastPromptShown: jest.fn(),
    canShowPrompt: () => false,
  };
  return { useGuestStore: (sel?: (s: typeof state) => unknown) => (sel ? sel(state) : state) };
});
jest.mock('@/hooks/useFavorites', () => ({
  useFavorites: () => ({
    items: [],
    addToFavorites: jest.fn(),
    removeFromFavorites: jest.fn(),
    isInFavorites: () => false,
    isFavoritesLoaded: () => true,
    fetchFavorites: jest.fn(() => Promise.resolve()),
  }),
}));

import ProductDetailScreen from '../index';

const getOneMock = productsApi.getOne as jest.Mock;
const incrementViewMock = productsApi.incrementView as jest.Mock;
const ratingsMock = ratingsApi.getProductRatings as jest.Mock;

/** Önbelleği test boyunca tutan istemci (yer tutucu testi: liste verisi render'dan önce silinmesin). */
const persistentClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity, networkMode: 'always' } } });

function productFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'p1',
    title: 'Vintage Model Araba',
    price: 1200,
    condition: 'good',
    status: 'active',
    availableQuantity: 3,
    images: [],
    seller: { id: 's1', displayName: 'Ali Veli' },
    createdAt: new Date('2025-01-01').toISOString(),
    ...overrides,
  };
}

/** Render ağacını belge sırasıyla "testID|metin" dizisine çevirir (öğe sırası doğrulaması için). */
const renderOrder = (node: { props: { testID?: unknown }; children: unknown[] }): string =>
  `${typeof node.props.testID === 'string' ? node.props.testID : ''}|${node.children
    .map((c) => (typeof c === 'string' ? c : renderOrder(c as typeof node)))
    .join('')}`;

describe('Ürün detay ekranı', () => {
  beforeEach(() => {
    getOneMock.mockReset();
    incrementViewMock.mockClear();
    ratingsMock.mockClear();
    mockTransitionReady = true;
    mockAuth = { isAuthenticated: false, user: null };
  });

  it('ürünü render eder (başlık + alıcı aksiyonları)', async () => {
    getOneMock.mockResolvedValue({ data: { data: productFixture() } });
    renderWithProviders(<ProductDetailScreen />);

    await waitFor(() => expect(screen.getByText('Vintage Model Araba')).toBeOnTheScreen());
    expect(screen.getByTestId('product-detail-buy-now-button')).toBeOnTheScreen();
    expect(screen.getByTestId('product-detail-add-to-cart-button')).toBeOnTheScreen();
  });

  it('pull-to-refresh yok: kaydırma gövdesinde RefreshControl / refreshControl çizilmez', async () => {
    getOneMock.mockResolvedValue({ data: { data: productFixture() } });
    renderWithProviders(<ProductDetailScreen />);

    await waitFor(() => expect(screen.getByText('Vintage Model Araba')).toBeOnTheScreen());
    const { RefreshControl } = jest.requireActual('react-native');
    expect(screen.UNSAFE_queryAllByType(RefreshControl)).toHaveLength(0);
    expect(screen.UNSAFE_root.findAll((n: { props?: { refreshControl?: unknown } }) => n.props?.refreshControl != null)).toHaveLength(0);
  });

  it('yüzen adalar: geri, ⋮ menü, paylaş, favori; sepet adası yok; üst bar başlığı yok', async () => {
    getOneMock.mockResolvedValue({ data: { data: productFixture() } });
    renderWithProviders(<ProductDetailScreen />);

    await waitFor(() => expect(screen.getByText('Vintage Model Araba')).toBeOnTheScreen());
    for (const id of [
      'product-back-button',
      'product-report-button',
      'product-favorite-button',
    ]) {
      expect(screen.getByTestId(id)).toBeOnTheScreen();
    }
    expect(screen.queryByTestId('product-cart-button')).toBeNull();
    expect(screen.getByLabelText('Paylaş')).toBeOnTheScreen();
  });

  it('alt sabit bar: fiyat · Hemen Al · Sepete Ekle (misafirde de)', async () => {
    getOneMock.mockResolvedValue({ data: { data: productFixture() } });
    renderWithProviders(<ProductDetailScreen />);

    await waitFor(() => expect(screen.getByText('Vintage Model Araba')).toBeOnTheScreen());
    const footer = within(screen.getByTestId('page-shell-footer'));
    expect(footer.getByTestId('product-bar-price')).toBeOnTheScreen();
    expect(footer.getByText('Hemen Al')).toBeOnTheScreen();
    expect(footer.getByTestId('product-detail-add-to-cart-button')).toBeOnTheScreen();
    // Başlığın altındaki fiyat ayrı testID ile durur.
    expect(screen.getByTestId('product-price')).toBeOnTheScreen();
  });

  it('takasa açık ilan: barın üstünde Takas Teklifi · Teklif Ver (tek giriş); çip yok, rozet satırında Takas', async () => {
    getOneMock.mockResolvedValue({ data: { data: productFixture({ tradeAvailable: true }) } });
    renderWithProviders(<ProductDetailScreen />);

    await waitFor(() => expect(screen.getByText('Vintage Model Araba')).toBeOnTheScreen());
    const footer = within(screen.getByTestId('page-shell-footer'));
    expect(footer.getByTestId('product-detail-offer-button')).toBeOnTheScreen();
    expect(footer.getByTestId('product-detail-trade-button')).toBeOnTheScreen();
    expect(screen.getAllByTestId('product-detail-offer-button')).toHaveLength(1);
    expect(screen.getAllByTestId('product-detail-trade-button')).toHaveLength(1);
    // Fiyat altı çipleri ve galeri rozeti kalktı; takas bilgisi rozet satırında.
    expect(screen.queryByTestId('product-negotiable-chip')).toBeNull();
    expect(screen.queryByTestId('product-trade-chip')).toBeNull();
    expect(screen.queryByTestId('product-gallery-trade-badge')).toBeNull();
    expect(within(screen.getByTestId('product-badge-row')).getByText('Takas')).toBeOnTheScreen();
  });

  it('takasa kapalı ilan: yalnız Teklif Ver; rozet satırı yok, çip yok', async () => {
    getOneMock.mockResolvedValue({ data: { data: productFixture() } });
    renderWithProviders(<ProductDetailScreen />);

    await waitFor(() => expect(screen.getByText('Vintage Model Araba')).toBeOnTheScreen());
    expect(screen.getByTestId('product-detail-offer-button')).toBeOnTheScreen();
    expect(screen.queryByTestId('product-detail-trade-button')).toBeNull();
    expect(screen.queryByTestId('product-negotiable-chip')).toBeNull();
    expect(screen.queryByTestId('product-badge-row')).toBeNull();
    expect(screen.queryByTestId('product-badge-trade')).toBeNull();
  });

  it('satılmış takas ilanında rozet satırı yok (Satıldı tekrarı yok), uyarı söyler; teklif/takas satırı yok', async () => {
    getOneMock.mockResolvedValue({
      data: { data: productFixture({ tradeAvailable: true, status: 'sold', availableQuantity: 0 }) },
    });
    renderWithProviders(<ProductDetailScreen />);

    await waitFor(() => expect(screen.getByText('Vintage Model Araba')).toBeOnTheScreen());
    expect(screen.queryByTestId('product-badge-sold')).toBeNull();
    expect(screen.queryByTestId('product-badge-row')).toBeNull();
    expect(screen.getByTestId('product-notice')).toBeOnTheScreen();
    expect(screen.queryByTestId('product-badge-trade')).toBeNull();
    expect(screen.queryByTestId('product-offer-trade-row')).toBeNull();
  });

  it('rezerve takas ilanında Takas rozeti yok', async () => {
    getOneMock.mockResolvedValue({ data: { data: productFixture({ tradeAvailable: true, status: 'reserved' }) } });
    renderWithProviders(<ProductDetailScreen />);

    await waitFor(() => expect(screen.getByText('Vintage Model Araba')).toBeOnTheScreen());
    expect(screen.queryByTestId('product-badge-trade')).toBeNull();
    expect(screen.queryByTestId('product-badge-sold')).toBeNull();
  });

  it('indirimli + takas: rozet sırası %İndirim → Takas ("İndirim" kelimesi yok); eski fiyat üstü çizili', async () => {
    getOneMock.mockResolvedValue({
      data: { data: productFixture({ tradeAvailable: true, price: 800, oldPrice: 1000, discountPercent: 20 }) },
    });
    renderWithProviders(<ProductDetailScreen />);

    await waitFor(() => expect(screen.getByText('Vintage Model Araba')).toBeOnTheScreen());
    const row = within(screen.getByTestId('product-badge-row'));
    expect(row.getByText('%20')).toBeOnTheScreen();
    expect(row.queryByText(/İndirim/i)).toBeNull();
    expect(screen.getByTestId('product-price-old')).toBeOnTheScreen();
    expect(screen.queryByTestId('product-badge-sold')).toBeNull();
    const order = renderOrder(screen.getByTestId('product-badge-row'));
    expect(order.indexOf('product-badge-sale|')).toBeGreaterThan(-1);
    expect(order.indexOf('product-badge-trade|')).toBeGreaterThan(order.indexOf('product-badge-sale|'));
  });

  it('durum uyarısı fiyat/rozet bloğunda, açıklamadan ÖNCE', async () => {
    getOneMock.mockResolvedValue({ data: { data: productFixture({ status: 'reserved', description: 'Açıklama metni' }) } });
    renderWithProviders(<ProductDetailScreen />);

    await waitFor(() => expect(screen.getByTestId('product-notice')).toBeOnTheScreen());
    const flat = renderOrder(screen.root);
    const priceAt = flat.indexOf('product-price|');
    const noticeAt = flat.indexOf('product-notice');
    const descAt = flat.indexOf('Açıklama metni');
    expect(priceAt).toBeGreaterThan(-1);
    expect(noticeAt).toBeGreaterThan(priceAt);
    expect(descAt).toBeGreaterThan(noticeAt);
  });

  it('satıcı Premium ise kartta Premium rozeti; değilse yok', async () => {
    getOneMock.mockResolvedValue({
      data: { data: productFixture({ seller: { id: 's1', displayName: 'Ali Veli', isPremium: true } }) },
    });
    const view = renderWithProviders(<ProductDetailScreen />);
    await waitFor(() => expect(screen.getByTestId('product-seller-premium-badge')).toBeOnTheScreen());
    expect(within(screen.getByTestId('product-seller-premium-badge')).getByText('Premium')).toBeOnTheScreen();
    view.unmount();

    getOneMock.mockResolvedValue({ data: { data: productFixture() } });
    renderWithProviders(<ProductDetailScreen />);
    await waitFor(() => expect(screen.getByTestId('product-seller-card')).toBeOnTheScreen());
    expect(screen.queryByTestId('product-seller-premium-badge')).toBeNull();
  });

  it('üyeliği takasa izin vermeyen kullanıcıda da Takas Teklifi düğmesi + rozet görünür; basınca dialog, /trade/new yok', async () => {
    mockAuth = { isAuthenticated: true, user: { id: 'u9', membershipTier: 'free' } as any };
    getOneMock.mockResolvedValue({ data: { data: productFixture({ tradeAvailable: true }) } });
    renderWithProviders(<ProductDetailScreen />);

    await waitFor(() => expect(screen.getByTestId('product-detail-trade-button')).toBeOnTheScreen());
    expect(screen.getByTestId('product-badge-trade')).toBeOnTheScreen();
    const { appAlert } = jest.requireMock('@/ui');
    appAlert.mockClear();
    const push = jest.requireMock('expo-router').router.push as jest.Mock;
    push.mockClear();
    fireEvent.press(screen.getByTestId('product-detail-trade-button'));
    expect(appAlert).toHaveBeenCalledTimes(1);
    // Mağaza kuralı: dialog'da satın alma/yükseltme düğmesi yok (yalnız varsayılan Tamam).
    expect(appAlert.mock.calls[0][2]).toBeUndefined();
    expect(push).not.toHaveBeenCalledWith(expect.stringContaining('/trade/new'));
  });

  it('üyeliği takasa izin veren kullanıcı Takas Teklifi ile /trade/new\'e gider', async () => {
    mockAuth = { isAuthenticated: true, user: { id: 'u9', membershipTier: 'premium' } as any };
    getOneMock.mockResolvedValue({ data: { data: productFixture({ tradeAvailable: true }) } });
    renderWithProviders(<ProductDetailScreen />);

    await waitFor(() => expect(screen.getByTestId('product-detail-trade-button')).toBeOnTheScreen());
    const { appAlert } = jest.requireMock('@/ui');
    appAlert.mockClear();
    fireEvent.press(screen.getByTestId('product-detail-trade-button'));
    expect(appAlert).not.toHaveBeenCalled();
    expect(jest.requireMock('expo-router').router.push).toHaveBeenCalledWith(
      '/trade/new?targetProductId=p1&targetSellerId=s1',
    );
  });

  it('misafire de Takas Teklifi görünür; basınca giriş istenir', async () => {
    jest.useFakeTimers();
    try {
      getOneMock.mockResolvedValue({ data: { data: productFixture({ tradeAvailable: true }) } });
      renderWithProviders(<ProductDetailScreen />);
      await waitFor(() => expect(screen.getByTestId('product-detail-trade-button')).toBeOnTheScreen());
      fireEvent.press(screen.getByTestId('product-detail-trade-button'));
      act(() => {
        jest.advanceTimersByTime(1600);
      });
      expect(jest.requireMock('expo-router').router.push).toHaveBeenCalledWith('/(auth)/login');
    } finally {
      jest.useRealTimers();
    }
  });

  it('sahipte Takas Teklifi düğmesi yok ama Takas rozeti var', async () => {
    mockAuth = { isAuthenticated: true, user: { id: 's1' } };
    getOneMock.mockResolvedValue({ data: { data: productFixture({ tradeAvailable: true }) } });
    renderWithProviders(<ProductDetailScreen />);

    await waitFor(() => expect(screen.getByTestId('product-detail-edit-button')).toBeOnTheScreen());
    expect(screen.queryByTestId('product-detail-trade-button')).toBeNull();
    expect(screen.getByTestId('product-badge-trade')).toBeOnTheScreen();
  });

  it('misafir "Teklif Ver"e dokununca giriş istenir (modal açılmaz)', async () => {
    jest.useFakeTimers();
    try {
      getOneMock.mockResolvedValue({ data: { data: productFixture() } });
      renderWithProviders(<ProductDetailScreen />);
      await waitFor(() => expect(screen.getByTestId('product-detail-offer-button')).toBeOnTheScreen());
      fireEvent.press(screen.getByTestId('product-detail-offer-button'));
      act(() => {
        jest.advanceTimersByTime(1600);
      });
      expect(jest.requireMock('expo-router').router.push).toHaveBeenCalledWith('/(auth)/login');
    } finally {
      jest.useRealTimers();
    }
  });

  it('sahip: altta fiyat + Düzenle, satın alma yok', async () => {
    mockAuth = { isAuthenticated: true, user: { id: 's1' } };
    getOneMock.mockResolvedValue({ data: { data: productFixture() } });
    renderWithProviders(<ProductDetailScreen />);

    await waitFor(() => expect(screen.getByTestId('product-detail-edit-button')).toBeOnTheScreen());
    expect(screen.queryByTestId('product-detail-add-to-cart-button')).toBeNull();
    expect(screen.queryByTestId('product-detail-buy-now-button')).toBeNull();
    // Kendi ilanına teklif/takas yok.
    expect(screen.queryByTestId('product-offer-trade-row')).toBeNull();
    expect(screen.queryByTestId('product-negotiable-chip')).toBeNull();
  });

  it('sahip: favori kalbi ve şikayet bayrağı çizilmez; paylaş durur', async () => {
    mockAuth = { isAuthenticated: true, user: { id: 's1' } };
    getOneMock.mockResolvedValue({ data: { data: productFixture() } });
    renderWithProviders(<ProductDetailScreen />);

    await waitFor(() => expect(screen.getByTestId('product-detail-edit-button')).toBeOnTheScreen());
    expect(screen.queryByTestId('product-favorite-button')).toBeNull();
    expect(screen.queryByTestId('product-report-button')).toBeNull();
    expect(screen.getByTestId('product-back-button')).toBeOnTheScreen();
    expect(screen.getByLabelText('Paylaş')).toBeOnTheScreen();
  });

  it('başkasının ilanında giriş yapmış kullanıcıya favori kalbi görünür', async () => {
    mockAuth = { isAuthenticated: true, user: { id: 'baska' } };
    getOneMock.mockResolvedValue({ data: { data: productFixture() } });
    renderWithProviders(<ProductDetailScreen />);

    await waitFor(() => expect(screen.getByText('Vintage Model Araba')).toBeOnTheScreen());
    expect(screen.getByTestId('product-favorite-button')).toBeOnTheScreen();
  });

  it('stokta yok üründe pasif buton gösterir', async () => {
    getOneMock.mockResolvedValue({
      data: { data: productFixture({ status: 'inactive', availableQuantity: 0 }) },
    });
    renderWithProviders(<ProductDetailScreen />);

    await waitFor(() =>
      expect(screen.getByTestId('product-detail-out-of-stock-button')).toBeOnTheScreen(),
    );
  });

  it('ürün bulunamazsa (404) boş durum gösterir, hata değil', async () => {
    getOneMock.mockRejectedValue({ response: { status: 404 } });
    renderWithProviders(<ProductDetailScreen />);

    await waitFor(() => expect(screen.getByText('Ürün bulunamadı')).toBeOnTheScreen());
    expect(screen.queryByTestId('error-state')).toBeNull();
    // 404 yeniden denenmez.
    expect(getOneMock).toHaveBeenCalledTimes(1);
  });

  it('ağ / 5xx hatası "bulunamadı" değil: hata + Tekrar Dene; yeniden deneyince ürün açılır', async () => {
    getOneMock.mockRejectedValue({ response: { status: 503 } });
    renderWithProviders(<ProductDetailScreen />);

    await waitFor(() => expect(screen.getByTestId('error-state')).toBeOnTheScreen(), { timeout: 4000 });
    expect(screen.queryByText('Ürün bulunamadı')).toBeNull();
    // Bir yeniden deneme (ağ/5xx) yapıldı.
    expect(getOneMock).toHaveBeenCalledTimes(2);

    getOneMock.mockResolvedValue({ data: { data: productFixture() } });
    fireEvent.press(within(screen.getByTestId('error-state')).getByRole('button'));
    await waitFor(() => expect(screen.getByText('Vintage Model Araba')).toBeOnTheScreen());
  });

  it('görüntülenme sorgu dışında, ürün başına bir kez sayılır; sayı detaya yazılır, listeler invalidate edilmez', async () => {
    const queryClient = persistentClient();
    queryClient.setQueryData(qk.products.popular, [{ id: 'baska', title: 'Başka', price: 5 }]);
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    getOneMock.mockResolvedValue({ data: { data: productFixture({ viewCount: 7 }) } });
    incrementViewMock.mockResolvedValueOnce({ data: { viewCount: 42 } });
    const view = renderWithProviders(<ProductDetailScreen />, { queryClient });

    await waitFor(() => expect(screen.getByText(/^42 /)).toBeOnTheScreen());
    expect(incrementViewMock).toHaveBeenCalledTimes(1);
    expect(getOneMock).toHaveBeenCalledTimes(1);
    expect(invalidate).not.toHaveBeenCalled();
    expect(queryClient.getQueryState(qk.products.popular)?.isInvalidated).toBe(false);

    // Yeniden render / tazeleme görüntülenmeyi yeniden saymaz.
    view.rerender(<ProductDetailScreen />);
    await act(async () => {
      await queryClient.refetchQueries({ queryKey: qk.products.detail('p1') });
    });
    expect(incrementViewMock).toHaveBeenCalledTimes(1);
  });

  it('sahibe-özel uçtan (onay bekleyen ilan) gelen veri görüntülenme saymaz', async () => {
    mockAuth = { isAuthenticated: true, user: { id: 'u9' } };
    getOneMock.mockRejectedValue({ response: { status: 404 } });
    (productsApi.getMyById as jest.Mock).mockResolvedValue({
      data: { data: productFixture({ status: 'pending' }) },
    });
    renderWithProviders(<ProductDetailScreen />);

    await waitFor(() => expect(screen.getByText('Vintage Model Araba')).toBeOnTheScreen());
    expect(productsApi.getMyById).toHaveBeenCalledTimes(1);
    expect(incrementViewMock).not.toHaveBeenCalled();
  });

  it('sahibi kendi aktif ilanına bakarken de görüntülenme saymaz; başkası sayar', async () => {
    mockAuth = { isAuthenticated: true, user: { id: 's1' } };
    getOneMock.mockResolvedValue({ data: { data: productFixture() } });
    const own = renderWithProviders(<ProductDetailScreen />);
    await waitFor(() => expect(screen.getByText('Vintage Model Araba')).toBeOnTheScreen());
    expect(incrementViewMock).not.toHaveBeenCalled();
    own.unmount();

    mockAuth = { isAuthenticated: true, user: { id: 'baska' } };
    renderWithProviders(<ProductDetailScreen />);
    await waitFor(() => expect(incrementViewMock).toHaveBeenCalledTimes(1));
  });

  it('liste önbelleğindeki kartla anında açılır: galeri + başlık + fiyat; tam veri isteyen bölümler iskelet, alt bar yok', async () => {
    const queryClient = persistentClient();
    queryClient.setQueryData(qk.products.homeFeatured, [
      { id: 'p1', title: 'Kart Başlığı', price: 990, images: [{ url: 'https://x/a.jpg' }], seller: { id: 's1' } },
    ]);
    let resolveDetail: (v: unknown) => void = () => undefined;
    getOneMock.mockReturnValue(new Promise((r) => (resolveDetail = r)));
    renderWithProviders(<ProductDetailScreen />, { queryClient });

    expect(screen.getByText('Kart Başlığı')).toBeOnTheScreen();
    expect(screen.getByTestId('product-price')).toHaveTextContent(/990/);
    expect(screen.queryByTestId('product-skeleton')).toBeNull();
    expect(screen.getByTestId('product-sections-skeleton')).toBeOnTheScreen();
    expect(screen.queryByTestId('product-seller-card')).toBeNull();
    expect(screen.queryByTestId('page-shell-footer')).toBeNull();
    // Yer tutucu görüntülenme saymaz.
    expect(incrementViewMock).not.toHaveBeenCalled();

    await act(async () => {
      resolveDetail({ data: { data: productFixture() } });
    });
    await waitFor(() => expect(screen.getByText('Vintage Model Araba')).toBeOnTheScreen());
    expect(screen.queryByTestId('product-sections-skeleton')).toBeNull();
    expect(screen.getByTestId('product-seller-card')).toBeOnTheScreen();
    expect(screen.getByTestId('product-detail-add-to-cart-button')).toBeOnTheScreen();
    expect(incrementViewMock).toHaveBeenCalledTimes(1);
  });

  it('özellikler / değerlendirmeler / benzer ürünler geçiş bitince bağlanır (sorguları da); galeri, başlık, alt bar hemen', async () => {
    mockTransitionReady = false;
    getOneMock.mockResolvedValue({ data: { data: productFixture() } });
    const view = renderWithProviders(<ProductDetailScreen />);

    await waitFor(() => expect(screen.getByText('Vintage Model Araba')).toBeOnTheScreen());
    expect(screen.getByTestId('product-detail-add-to-cart-button')).toBeOnTheScreen();
    expect(screen.getByTestId('product-seller-card')).toBeOnTheScreen();
    expect(screen.queryByTestId('product-specs')).toBeNull();
    expect(screen.queryByTestId('product-reviews')).toBeNull();
    expect(screen.getByTestId('product-deferred-skeleton')).toBeOnTheScreen();
    expect(ratingsMock).not.toHaveBeenCalled();

    mockTransitionReady = true;
    view.rerender(<ProductDetailScreen />);
    await waitFor(() => expect(screen.getByTestId('product-reviews')).toBeOnTheScreen());
    expect(screen.getByTestId('product-specs')).toBeOnTheScreen();
    expect(screen.queryByTestId('product-deferred-skeleton')).toBeNull();
    expect(ratingsMock).toHaveBeenCalledTimes(1);
  });
});
