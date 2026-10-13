/**
 * checkout · web gibi TEK sayfa ödeme akışının MOBİL-UI dilimleri.
 * J1 (üye satın alma akışı UI), J25, J54.
 * Test edilen: bölüm düzeni, ödeme butonu metni/durumu, fiyat özeti render,
 * boş sepet durumu, form validasyonu (toast) → ödeme engeli.
 * Backend sipariş/ödeme oluşturma backend-only (handleCheckout) — test edilmez.
 */
import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { ToastHost } from '@/ui';
import { resetToastForTests } from '@/ui/components/Toast';

// AsyncStorage native modülü test ortamında null; resmi jest mock'u kullan.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// expo-router mock (login.test kalıbı)
jest.mock('expo-router', () => require('@/test-utils/router-mock').routerMock);

// API inline mock — ağ yok, deterministik. Checkout'un kullandığı tüm api'lar.
jest.mock('@/lib/api', () => ({
  toExpectedPricing: jest.requireActual('@/lib/api').toExpectedPricing,
  ordersApi: {
    getQuote: jest.fn(() =>
      Promise.resolve({
        data: {
          pricingHash: '70a8bdadff29af70',
          shippingTariffVersion: 3,
          pricing: {
            summary: { productAmount: 100, shippingAmount: 50, serviceFeeAmount: 15, total: 165 },
          },
        },
      }),
    ),
  },
  paymentsApi: {
    getPaymentMethods: jest.fn(() => Promise.resolve({ data: [] })),
    directForm: jest.fn(),
    initiate: jest.fn(),
    initiateGuest: jest.fn(),
    bypassComplete: jest.fn(),
  },
  // shippingApi'de artik kargo UCRETI ucu YOK (getRatesByCity/getRates/
  // calculateRates/getCarriers kaldirildi) - kargo yalniz quote'tan gelir.
  // API yuzeyi garantisi: src/lib/api/__tests__/orders.test.ts.
  addressesApi: { getAll: jest.fn(() => Promise.resolve({ data: [] })) },
  discountsApi: { validate: jest.fn() },
}));

// Konuk akışı: misafir kullanıcı → adres formu inline görünür (testID gerektirmez).
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (state: any) => unknown) => {
    const state: any = ({ isAuthenticated: false, user: null });
    return sel ? sel(state) : state;
  },
}));

import { useCartStore } from '@/stores/cartStore';
import CheckoutScreen from '../index';

const seedCart = (items: any[]) => {
  useCartStore.setState({ items, lastUpdated: Date.now() });
};

const SAMPLE_ITEM = {
  id: 'cart-1',
  productId: 'prod-1234567890',
  title: 'Test Model Araba',
  price: 100,
  quantity: 1,
  imageUrl: 'https://x/y.jpg',
  brand: 'Bburago',
  scale: '1:18',
  seller: { id: 's1', displayName: 'Satıcı' },
  addedAt: Date.now(),
};

/**
 * Mesafeli satış onayı (P2 #9) ödeme butonunu kapatıyor — her ödeme akışı
 * önce kutuyu işaretlemeli, tıpkı kullanıcının yaptığı gibi.
 */
function acceptDistanceSales() {
  const box = screen.queryByTestId('checkout-distance-sales-checkbox');
  if (box) fireEvent.press(box);
}

describe('checkout-tek-sayfa', () => {
  afterEach(() => {
    useCartStore.setState({ items: [] });
    resetToastForTests();
  });

  describe('J1 · boş sepet durumu', () => {
    it('sepet boşsa boş ekran + Alışverişe Başla butonu', () => {
      seedCart([]);
      renderWithProviders(<CheckoutScreen />);
      expect(screen.getByText('Sepetiniz boş')).toBeOnTheScreen();
      expect(screen.getByText('Alışverişe Başla')).toBeOnTheScreen();
    });
  });

  describe('J25 · tek sayfa düzeni (web CheckoutClient)', () => {
    it('bölümler alt alta: ürünler, teslimat adresi, ödeme yöntemi, sipariş özeti', () => {
      seedCart([SAMPLE_ITEM]);
      renderWithProviders(<CheckoutScreen />);
      expect(screen.getByTestId('checkout-items')).toBeOnTheScreen();
      expect(screen.getByText('Teslimat Adresi')).toBeOnTheScreen();
      expect(screen.getByText('Ödeme Yöntemi')).toBeOnTheScreen();
      // Web'de olduğu gibi iki kart da "Sipariş Özeti" başlığını taşır (ürünler + özet).
      expect(screen.getAllByText('Sipariş Özeti')).toHaveLength(2);
      expect(screen.getByText('Test Model Araba')).toBeOnTheScreen();
    });

    it('adım göstergesi ve "Devam Et" yok — sabit alt barda tek "Ödeme Yap" düğmesi var', () => {
      seedCart([SAMPLE_ITEM]);
      renderWithProviders(<CheckoutScreen />);
      expect(screen.queryByText('Devam Et')).toBeNull();
      expect(screen.queryByText('Adres')).toBeNull();
      expect(screen.queryByText('Onay')).toBeNull();
      expect(screen.queryByText(/Onayla ve Öde/)).toBeNull();
      expect(screen.getByText('Ödeme Yap')).toBeOnTheScreen();
      expect(screen.getByTestId('page-shell-footer')).toBeOnTheScreen();
    });

    it('sözleşme onaylanana kadar "Ödeme Yap" kapalı ve nedeni yazılır', () => {
      seedCart([SAMPLE_ITEM]);
      renderWithProviders(<CheckoutScreen />);
      expect(screen.getByTestId('checkout-pay-button')).toBeDisabled();
      expect(
        screen.getByText('Devam etmek için mesafeli satış sözleşmesini onaylayın'),
      ).toBeOnTheScreen();
    });

    it('özet etiketleri web ile aynı: Ürün ücreti, Kargo ücreti, Hizmet Bedeli, Toplam', async () => {
      seedCart([SAMPLE_ITEM]);
      renderWithProviders(<CheckoutScreen />);
      await waitFor(() => expect(screen.getByText('165,00 TL')).toBeOnTheScreen());
      expect(screen.getByText('Ürün ücreti')).toBeOnTheScreen();
      expect(screen.getByText('Kargo ücreti')).toBeOnTheScreen();
      expect(screen.getByText('Hizmet Bedeli')).toBeOnTheScreen();
      expect(screen.getByText('Toplam')).toBeOnTheScreen();
      // Kargo firması adı etikete gömülmez; eski adım-3 başlıkları yok.
      expect(screen.queryByText(/Sürat/)).toBeNull();
      expect(screen.queryByText('Ödeme Detayı')).toBeNull();
      expect(screen.queryByText(/Ara Toplam/)).toBeNull();
    });

    it('kargo satırı il seçilmeden de summary.shippingAmount ile basılır', async () => {
      seedCart([SAMPLE_ITEM]);
      renderWithProviders(<CheckoutScreen />);
      // Quote şehirden bağımsız (`items` gövdesi) ve `summary.total` kargoyu
      // zaten içeriyor. Eski "İl seçin" kapısı, kargo satırı gizliyken toplamın
      // kargolu olmasına yol açıyordu → satırlar toplama eşit görünmüyordu.
      await waitFor(() => expect(screen.getByText('50,00 TL')).toBeOnTheScreen());
      expect(screen.queryByText('İl seçin')).toBeNull();
    });
  });

  describe('J54 · form doğrulaması ödeme düğmesinde (eski adım-1 kapısı)', () => {
    it('konuk bilgileri boşken "Ödeme Yap" hata gösterir, sipariş/OTP başlamaz', async () => {
      seedCart([SAMPLE_ITEM]);
      renderWithProviders(<><CheckoutScreen /><ToastHost /></>);
      acceptDistanceSales();
      await waitFor(() => expect(screen.getByTestId('checkout-pay-button')).not.toBeDisabled());
      fireEvent.press(screen.getByText('Ödeme Yap'));
      await waitFor(() =>
        expect(screen.getByText('Lütfen adınızı girin')).toBeOnTheScreen(),
      );
      expect(screen.queryByTestId('guest-otp-input')).toBeNull();
    });
  });

  describe('Fiyat sözleşmesi — özet quote.pricing.summary\'den gelir', () => {
    it('dört satır da summary\'den gelir ve üç satırın toplamı Toplam\'a eşittir', async () => {
      seedCart([SAMPLE_ITEM]);
      renderWithProviders(<CheckoutScreen />);

      // summary.total (165) — eski yerel aritmetik (subtotal 100 + shippingCost 0
      // + buyerFee/taxAmount 0 - indirim 0 = 100) render edilseydi bu metin YOK olurdu.
      await waitFor(() => {
        expect(screen.getByText('165,00 TL')).toBeOnTheScreen();
      });
      // Üç satır: 100 + 50 + 15 = 165 → satırlar toplama BİREBİR eşit.
      // (Sunucu garantisi; ekrana araya başka bir para satırı eklenmez.)
      expect(screen.getByText('100,00 TL')).toBeOnTheScreen();
      expect(screen.getByText('50,00 TL')).toBeOnTheScreen();
      expect(screen.getByText('15,00 TL')).toBeOnTheScreen();
      // serviceFeeAmount hizmet bedeli + TÜM alıcı hizmet KDV'sini içerir —
      // ayrı bir "KDV" satırı basılmaz (çift sayım).
      expect(screen.queryByText('KDV')).toBeNull();
    });
  });
});
