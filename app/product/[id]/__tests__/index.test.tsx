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

  it('takasa açık ilan: barın üstünde Takas Teklifi · Teklif Ver, fiyat çipleri, galeri rozeti; tek giriş', async () => {
    getOneMock.mockResolvedValue({ data: { data: productFixture({ tradeAvailable: true }) } });
    renderWithProviders(<ProductDetailScreen />);

    await waitFor(() => expect(screen.getByText('Vintage Model Araba')).toBeOnTheScreen());
    const footer = within(screen.getByTestId('page-shell-footer'));
    expect(footer.getByTestId('product-detail-offer-button')).toBeOnTheScreen();
    expect(footer.getByTestId('product-detail-trade-button')).toBeOnTheScreen();
    // Her eylemin tek düğmesi var (çipler kısayol).
    expect(screen.getAllByTestId('product-detail-offer-button')).toHaveLength(1);
    expect(screen.getAllByTestId('product-detail-trade-button')).toHaveLength(1);
    expect(screen.getByTestId('product-negotiable-chip')).toBeOnTheScreen();
    expect(screen.getByTestId('product-trade-chip')).toBeOnTheScreen();
    expect(screen.getByTestId('product-gallery-trade-badge')).toBeOnTheScreen();
  });

  it('takasa kapalı ilan: yalnız Teklif Ver + Pazarlık çipi; takas rozeti yok', async () => {
    getOneMock.mockResolvedValue({ data: { data: productFixture() } });
    renderWithProviders(<ProductDetailScreen />);

    await waitFor(() => expect(screen.getByText('Vintage Model Araba')).toBeOnTheScreen());
    expect(screen.getByTestId('product-detail-offer-button')).toBeOnTheScreen();
    expect(screen.queryByTestId('product-detail-trade-button')).toBeNull();
    expect(screen.getByTestId('product-negotiable-chip')).toBeOnTheScreen();
    expect(screen.queryByTestId('product-trade-chip')).toBeNull();
    expect(screen.queryByTestId('product-gallery-trade-badge')).toBeNull();
  });

  it('satılmış takas ilanında galeri rozeti, çipler ve teklif/takas satırı yok', async () => {
    getOneMock.mockResolvedValue({
      data: { data: productFixture({ tradeAvailable: true, status: 'sold', availableQuantity: 0 }) },
    });
    renderWithProviders(<ProductDetailScreen />);

    await waitFor(() => expect(screen.getByText('Vintage Model Araba')).toBeOnTheScreen());
    expect(screen.queryByTestId('product-gallery-trade-badge')).toBeNull();
    expect(screen.queryByTestId('product-trade-chip')).toBeNull();
    expect(screen.queryByTestId('product-offer-trade-row')).toBeNull();
  });

  it('misafir teklif çipine dokununca giriş istenir (modal açılmaz)', async () => {
    jest.useFakeTimers();
    try {
      getOneMock.mockResolvedValue({ data: { data: productFixture() } });
      renderWithProviders(<ProductDetailScreen />);
      await waitFor(() => expect(screen.getByTestId('product-negotiable-chip')).toBeOnTheScreen());
      fireEvent.press(screen.getByTestId('product-negotiable-chip'));
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

  it('sahip: favori kalbi çizilmez; diğer yüzen adalar durur', async () => {
    mockAuth = { isAuthenticated: true, user: { id: 's1' } };
    getOneMock.mockResolvedValue({ data: { data: productFixture() } });
    renderWithProviders(<ProductDetailScreen />);

    await waitFor(() => expect(screen.getByTestId('product-detail-edit-button')).toBeOnTheScreen());
    expect(screen.queryByTestId('product-favorite-button')).toBeNull();
    expect(screen.getByTestId('product-report-button')).toBeOnTheScreen();
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
