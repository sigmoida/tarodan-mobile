/**
 * checkout-coupon-quote · kupon → quote sözleşmesi (coordinator follow-up,
 * task-1 sonrası).
 *
 * Canlı ölçüm (coordinator, 2026-08-02):
 *   POST /orders/quote {items, couponCode:"GECERSIZKOD123"} → 400 "Kupon kodu bulunamadı"
 *   POST /orders/quote {items, couponCode:null|""|yok}      → 201
 * `CheckoutQuoteDto.couponCode` dokümanı: doğrulanmış kod gönderilirse sunucu
 * indirimi quote'a da uygular ("so the preview total matches the charged total").
 *
 * Test edilen:
 *  1. Doğrulanmış kupon quote isteğine `couponCode` olarak eklenir; toplam
 *     (`summary.total`) indirimli değere güncellenir.
 *  2. Kupon değişince (uygulanınca) quote yeniden çekilir — queryKey'e dahil.
 *  3. 400 "Kupon kodu bulunamadı" checkout'u kilitlemez: kupon düşer, quote
 *     kuponsuz yenilenir (ekran çalışır durumda kalır, toplam indirimsize döner),
 *     kullanıcıya appAlert ile haber verilir.
 */
import React from 'react';
import { screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-router', () => require('@/test-utils/router-mock').routerMock);

// appAlert'i gözlemlenebilir yap; @/ui'nin geri kalanı gerçek implementasyon.
jest.mock('@/ui', () => {
  const actual = jest.requireActual('@/ui');
  return { ...actual, appAlert: jest.fn() };
});

// getQuote: couponCode VARSA indirimli özet, YOKSA indirimsiz özet döner —
// gerçek sunucu davranışının sahte bir modeli (indirim yalnız kod gönderilince
// uygulanır). Ayrı jest.fn() ile override edilebilsin diye mockImplementation
// test içinde de değiştirilebilir.
const NO_COUPON_QUOTE = {
  pricingHash: 'hash-no-coupon',
  shippingTariffVersion: 3,
  pricing: { summary: { productAmount: 100, shippingAmount: 50, serviceFeeAmount: 15, total: 165 } },
};
const WITH_COUPON_QUOTE = {
  pricingHash: 'hash-with-coupon',
  shippingTariffVersion: 3,
  pricing: { summary: { productAmount: 80, shippingAmount: 50, serviceFeeAmount: 15, total: 145 } },
};

jest.mock('@/lib/api', () => ({
  ordersApi: {
    checkout: jest.fn(),
    checkoutGuest: jest.fn(),
    getQuote: jest.fn((data: any) =>
      data?.couponCode
        ? Promise.resolve({ data: { pricingHash: 'hash-with-coupon', shippingTariffVersion: 3, pricing: { summary: { productAmount: 80, shippingAmount: 50, serviceFeeAmount: 15, total: 145 } } } })
        : Promise.resolve({ data: { pricingHash: 'hash-no-coupon', shippingTariffVersion: 3, pricing: { summary: { productAmount: 100, shippingAmount: 50, serviceFeeAmount: 15, total: 165 } } } }),
    ),
  },
  paymentsApi: {
    getPaymentMethods: jest.fn(() => Promise.resolve({ data: [] })),
    initiateGroup: jest.fn(),
    initiateGroupGuest: jest.fn(),
    bypassComplete: jest.fn(),
  },
  shippingApi: { getRatesByCity: jest.fn() },
  addressesApi: { getAll: jest.fn(() => Promise.resolve({ data: [] })) },
  discountsApi: {
    validate: jest.fn(),
    validateGuest: jest.fn(() =>
      Promise.resolve({ data: { isValid: true, discount: { code: 'INDIRIM10', estimatedDiscount: 20 } } }),
    ),
  },
}));

jest.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({ isAuthenticated: false, user: null }),
}));

import { appAlert } from '@/ui';
import { ordersApi, discountsApi } from '@/lib/api';
import { useCartStore } from '@/stores/cartStore';
import CheckoutScreen from '../index';

const seedCart = (items: any[]) => useCartStore.setState({ items, lastUpdated: Date.now() });

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

describe('Kupon → quote sözleşmesi', () => {
  beforeEach(() => {
    jest.mocked(appAlert).mockClear();
    jest.mocked(ordersApi.getQuote).mockClear();
    jest.mocked(discountsApi.validateGuest).mockClear();
    seedCart([SAMPLE_ITEM]);
  });

  afterEach(() => {
    useCartStore.setState({ items: [] });
  });

  // NOT: yalnız yazıp basar — "uygulandı" durumunu BEKLEMEZ. 400 senaryosunda
  // kupon quote reddi yüzünden apply→remove aynı act() flush'ında zincirlenip
  // "uygulandı" hiç gözlemlenebilir olmayabiliyor (kod eşzamanlı sıfırlanıyor).
  // Anlamlı olan varış durumu — o da her testte ayrı ayrı doğrulanıyor.
  const applyCoupon = async () => {
    fireEvent.changeText(screen.getByTestId('coupon-input'), 'indirim10');
    await act(async () => {
      fireEvent.press(screen.getByTestId('coupon-apply-button'));
    });
  };

  it('doğrulanmış kupon quote isteğine eklenir, toplam indirimli değere güncellenir', async () => {
    renderWithProviders(<CheckoutScreen />);

    // Başlangıç: kuponsuz quote (165,00 TL).
    await waitFor(() => expect(screen.getByText('165,00 TL')).toBeOnTheScreen());

    await applyCoupon();

    // Kupon başarıyla uygulandı ve bu senaryoda quote'ta da kabul edildi — rozet kalıcı.
    await waitFor(() => expect(screen.getByTestId('coupon-applied')).toBeOnTheScreen());

    // Kupon queryKey'e dahil olduğundan yeni bir istek atılır — couponCode ile.
    await waitFor(() => {
      expect(ordersApi.getQuote).toHaveBeenCalledWith(
        expect.objectContaining({ couponCode: 'INDIRIM10' }),
      );
    });

    // summary.total indirimli değere güncellenir (145,00 TL) — yerel arimetik değil.
    await waitFor(() => expect(screen.getByText('145,00 TL')).toBeOnTheScreen());
  });

  it('400 "Kupon kodu bulunamadı" checkout u kilitlemez: kupon düşer, quote kuponsuz yenilenir', async () => {
    // couponCode'lu her getQuote çağrısı 400 döndürsün (kupon quote'ta geçersiz).
    (jest.mocked(ordersApi.getQuote) as unknown as jest.Mock).mockImplementation((data: any) =>
      data?.couponCode
        ? Promise.reject({ response: { status: 400, data: { message: 'Kupon kodu bulunamadı' } } })
        : Promise.resolve({
            data: {
              pricingHash: 'hash-no-coupon',
              shippingTariffVersion: 3,
              pricing: { summary: { productAmount: 100, shippingAmount: 50, serviceFeeAmount: 15, total: 165 } },
            },
          }),
    );

    renderWithProviders(<CheckoutScreen />);
    await waitFor(() => expect(screen.getByText('165,00 TL')).toBeOnTheScreen());

    await applyCoupon();

    // appAlert ile bilgilendirilir — sunucunun ham mesajı ("Kupon kodu bulunamadı").
    await waitFor(() => {
      expect(appAlert).toHaveBeenCalledWith('Kupon Geçersiz', 'Kupon kodu bulunamadı');
    });

    // Kupon düşürülür — "uygulandı" rozeti kalkar, kupon giriş kutusu geri gelir.
    await waitFor(() => expect(screen.queryByTestId('coupon-applied')).toBeNull());
    expect(screen.getByTestId('coupon-input')).toBeOnTheScreen();

    // Quote kuponsuz yenilenmiş — toplam indirimsiz değere (165,00 TL) döner,
    // ekran çalışır durumda kalır (hâlâ "Devam Et" ile ilerlenebilir).
    await waitFor(() => expect(screen.getByText('165,00 TL')).toBeOnTheScreen());
    expect(screen.getByText('Devam Et')).toBeOnTheScreen();
  });
});
