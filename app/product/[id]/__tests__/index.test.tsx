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

jest.mock('@/lib/api', () => ({
  productsApi: {
    getOne: jest.fn(),
    incrementView: jest.fn(() => Promise.resolve({ data: {} })),
    getMyById: jest.fn(),
  },
  ratingsApi: { getProductRatings: jest.fn(() => Promise.resolve({ data: { ratings: [] } })) },
  userReportsApi: { create: jest.fn() },
}));
import { productsApi } from '@/lib/api';

// Ağır child modaller test kapsamı dışı — izole et (ekranı test ediyoruz, çocuklarını değil).
jest.mock('@/components/product/MakeOfferModal', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/product/AddToCollectionModal', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/SignupPrompt', () => ({ SignupPrompt: () => null }));

let mockAuth = { isAuthenticated: false, user: null as { id: string } | null };
jest.mock('@/stores/authStore', () => ({ useAuthStore: (sel?: (state: any) => unknown) => {
    const state: any = mockAuth ;
    return sel ? sel(state) : state;
  }}));
jest.mock('@/stores/cartStore', () => ({
  useCartStore: () => ({ addItem: jest.fn(), isInCart: () => false, setBuyNow: jest.fn() }),
}));
jest.mock('@/stores/guestStore', () => ({
  useGuestStore: () => ({
    incrementProductView: jest.fn(),
    getPromptType: () => null,
    setLastPromptShown: jest.fn(),
    canShowPrompt: () => false,
  }),
}));
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
    mockAuth = { isAuthenticated: false, user: null };
  });

  it('ürünü render eder (başlık + alıcı aksiyonları)', async () => {
    getOneMock.mockResolvedValue({ data: { data: productFixture() } });
    renderWithProviders(<ProductDetailScreen />);

    await waitFor(() => expect(screen.getByText('Vintage Model Araba')).toBeOnTheScreen());
    expect(screen.getByTestId('product-detail-buy-now-button')).toBeOnTheScreen();
    expect(screen.getByTestId('product-detail-add-to-cart-button')).toBeOnTheScreen();
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

  it('ürün bulunamazsa boş durum gösterir', async () => {
    getOneMock.mockRejectedValue(new Error('404'));
    renderWithProviders(<ProductDetailScreen />);

    await waitFor(() => expect(screen.getByText('Ürün bulunamadı')).toBeOnTheScreen());
  });
});
