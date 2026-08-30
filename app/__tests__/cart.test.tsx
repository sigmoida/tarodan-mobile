/**
 * J1 · sepet özeti ekranı, J22 · boş sepet, J33 · adet kontrolü UI,
 * J59 · ürün satırı çıkarma UI, J60 · checkout navigasyon wiring.
 * Sadece MOBİL-UI dilimleri (render/durum/navigasyon).
 */
import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { resetRouterMocks, pushMock, replaceMock } from '@/test-utils/router-mock';
import { useCartStore } from '@/stores/cartStore';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-router', () => require('@/test-utils/router-mock').routerMock);

import { ordersApi } from '@/lib/api';
import CartScreen from '../cart';

// Sepet özeti artık `POST /orders/quote` gövdesinden besleniyor (istemci
// aritmetiği kaldırıldı). Bu dosya UI/navigasyon dilimlerini test ediyor;
// fiyat sözleşmesinin kendi testi `app/cart/__tests__/cart-summary.test.tsx`.
// Burada yalnızca ağ çağrısını deterministik yapıyoruz.
const QUOTE_SUMMARY = { productAmount: 190, shippingAmount: 50, serviceFeeAmount: 24.4, total: 264.4 };
jest.spyOn(ordersApi, 'getQuote').mockResolvedValue({
  data: { pricingHash: 'h', shippingTariffVersion: 3, pricing: { summary: QUOTE_SUMMARY } },
} as any);

const seedItem = (over: Partial<any> = {}) => ({
  id: 'cart-1',
  productId: 'p1',
  title: 'Hot Wheels Mustang',
  price: 100,
  quantity: 1,
  imageUrl: 'http://x/img.png',
  seller: { id: 's1', displayName: 'Satıcı' },
  addedAt: Date.now(),
  ...over,
});

const reset = () => useCartStore.setState({ items: [], lastUpdated: Date.now(), isLoading: false });

beforeEach(() => {
  resetRouterMocks();
  reset();
});

describe('J22 · boş sepet', () => {
  it('boş sepette boş durum metni gösterilir', () => {
    renderWithProviders(<CartScreen />);
    expect(screen.getByText('Sepetiniz Boş')).toBeOnTheScreen();
  });

  it('boş sepette ilanlara götüren buton ana sayfaya replace eder', () => {
    renderWithProviders(<CartScreen />);
    fireEvent.press(screen.getByText('İlanları İncele'));
    expect(replaceMock).toHaveBeenCalledWith('/');
  });
});

describe('J1 · sepet özeti (ürün satırı + ara toplam/kargo/toplam)', () => {
  beforeEach(() => {
    useCartStore.setState({ items: [seedItem({ quantity: 2 })] });
  });

  it('ürün satırı render edilir', () => {
    renderWithProviders(<CartScreen />);
    expect(screen.getAllByTestId('cart-item-row')).toHaveLength(1);
    expect(screen.getByText('Hot Wheels Mustang')).toBeOnTheScreen();
  });

  it('özet satırları sunucu quote undan gelir — yerel price*quantity toplamı basılmaz', async () => {
    renderWithProviders(<CartScreen />);
    // Ara Toplam sunucunun `summary.productAmount`'ı (190); yerel 2×100 = 200 değil.
    await waitFor(() => expect(screen.getByText('190,00 TL')).toBeOnTheScreen());
    expect(screen.queryByText('₺200')).toBeNull();
    // Kargo da quote'tan gelir; sabit fallback yok.
    expect(screen.getByText('50,00 TL')).toBeOnTheScreen();
    expect(screen.queryByText('₺49.90')).toBeNull();
  });
});

describe('J33 · adet gösterimi (UI)', () => {
  it('ürün satırında mevcut adet gösterilir', () => {
    useCartStore.setState({ items: [seedItem({ quantity: 3 })] });
    renderWithProviders(<CartScreen />);
    expect(screen.getByText('3')).toBeOnTheScreen();
  });
});

describe('J59 · ürün çıkarma (UI)', () => {
  beforeEach(() => {
    useCartStore.setState({ items: [seedItem()] });
  });

  it('kaldır butonu (accessibilityLabel) ürünü sepetten siler', () => {
    renderWithProviders(<CartScreen />);
    // `cart.removeItem` reuse (rule #1): katalogdaki metin "sepetten" içermiyor.
    fireEvent.press(screen.getByLabelText('Ürünü Kaldır'));
    expect(useCartStore.getState().items).toHaveLength(0);
  });
});

describe('J60 · checkout navigasyon wiring', () => {
  beforeEach(() => {
    useCartStore.setState({ items: [seedItem()] });
  });

  it('Satın Al checkout ekranına push eder', async () => {
    renderWithProviders(<CartScreen />);
    // Buton sunucu toplamı gelene kadar KAPALI (quote hata verse de, 200 dönüp
    // `total` boş gelse de) — yerel bir tutarla ödeme adımına geçirmemek için.
    // Navigasyonu sürmek için önce quote'un oturmasını bekle.
    await waitFor(() => expect(screen.getByTestId('cart-checkout-total')).toHaveTextContent('264,40 TL'));
    fireEvent.press(screen.getByTestId('cart-checkout-button'));
    expect(pushMock).toHaveBeenCalledWith('/checkout');
  });

  it('ürün satırına tıklayınca ürün detayına push eder', () => {
    renderWithProviders(<CartScreen />);
    fireEvent.press(screen.getByText('Hot Wheels Mustang'));
    expect(pushMock).toHaveBeenCalledWith('/product/p1');
  });
});
