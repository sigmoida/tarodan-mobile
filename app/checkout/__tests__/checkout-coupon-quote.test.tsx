/**
 * checkout-coupon-quote · kupon → quote sözleşmesi + kupon indiriminin GÖSTERİMİ.
 *
 * Canlı ölçüm (coordinator, 2026-08-02, staging):
 *   POST /orders/quote {items, couponCode:"GECERSIZKOD123"} → 400 "Kupon kodu bulunamadı"
 *   POST /orders/quote {items, couponCode:null|""|yok}      → 201
 *   201 gövdesi: KÖKTE `couponDiscount`, `pricing.summary` = {productAmount,
 *   shippingAmount, serviceFeeAmount, total} ve ÜÇ SATIRIN TOPLAMI `total`a
 *   BİREBİR eşit (619,92 + 50 + 84,40 = 754,32).
 *
 * Test edilen:
 *  1. Doğrulanmış kupon quote isteğine `couponCode` olarak eklenir; toplam
 *     (`summary.total`) indirimli değere güncellenir.
 *  2. Özet satırlarının toplamı `total`a eşit kalır; `/discounts/validate`'in
 *     `estimatedDiscount`'u ekranda HİÇBİR yerde görünmez (özet satırı olarak
 *     basıldığında satırlar toplamı tutmuyor, kullanıcı açıklanamayan bir fark
 *     görüyordu). İndirim yalnız kupon rozetinde, quote kökündeki `couponDiscount`
 *     değeriyle gösterilir.
 *  3. 400 "Kupon kodu bulunamadı" checkout'u kilitlemez: kupon düşer, quote
 *     kuponsuz yenilenir, kullanıcıya appAlert ile haber verilir.
 *  4. Aynı geçersiz kod ikinci kez uygulanınca uyarı YİNE çıkar — kuponsuz
 *     sonucun kuponlu queryKey altına yazılması (`staleTime: 60_000`) önbelleği
 *     zehirliyordu: ikinci denemede istek hiç gitmiyor, uyarı çıkmıyor, "uygulandı"
 *     rozeti kalıyor ve sipariş ucundan ham 400 geliyordu.
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
// uygulanır). Her iki fixture'da da ÜÇ SATIRIN TOPLAMI total'a eşit.
//
// `estimatedDiscount` (18) ile sunucunun `couponDiscount`'u (20) BİLEREK farklı:
// ekranda 18 görünürse yanlış kaynak kullanılıyor demektir.
jest.mock('@/lib/api', () => ({
  toExpectedPricing: jest.requireActual('@/lib/api').toExpectedPricing,
  ordersApi: {
    checkout: jest.fn(),
    checkoutGuest: jest.fn(),
    getQuote: jest.fn((data: any) =>
      data?.couponCode
        ? Promise.resolve({
            data: {
              pricingHash: 'hash-with-coupon',
              shippingTariffVersion: 3,
              couponDiscount: 20,
              pricing: { summary: { productAmount: 80, shippingAmount: 50, serviceFeeAmount: 15, total: 145 } },
            },
          })
        : Promise.resolve({
            data: {
              pricingHash: 'hash-no-coupon',
              shippingTariffVersion: 3,
              couponDiscount: 0,
              pricing: { summary: { productAmount: 100, shippingAmount: 50, serviceFeeAmount: 15, total: 165 } },
            },
          }),
    ),
  },
  paymentsApi: {
    getPaymentMethods: jest.fn(() => Promise.resolve({ data: [] })),
    initiateGroup: jest.fn(),
    initiateGroupGuest: jest.fn(),
    bypassComplete: jest.fn(),
  },
  addressesApi: { getAll: jest.fn(() => Promise.resolve({ data: [] })) },
  discountsApi: {
    validate: jest.fn(),
    validateGuest: jest.fn(() =>
      Promise.resolve({ data: { isValid: true, discount: { code: 'INDIRIM10', estimatedDiscount: 18 } } }),
    ),
  },
}));

jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (state: any) => unknown) => {
    const state: any = ({ isAuthenticated: false, user: null });
    return sel ? sel(state) : state;
  },
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

const REJECT_COUPON = {
  response: { status: 400, data: { message: 'Kupon kodu bulunamadı' } },
};
const NO_COUPON_RESPONSE = {
  data: {
    pricingHash: 'hash-no-coupon',
    shippingTariffVersion: 3,
    couponDiscount: 0,
    pricing: { summary: { productAmount: 100, shippingAmount: 50, serviceFeeAmount: 15, total: 165 } },
  },
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
  const applyCoupon = async (code = 'indirim10') => {
    fireEvent.changeText(screen.getByTestId('coupon-input'), code);
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

  it('kupon uygulanınca özet satırlarının toplamı total\'a eşit kalır; estimatedDiscount hiç görünmez', async () => {
    renderWithProviders(<CheckoutScreen />);
    await waitFor(() => expect(screen.getByText('165,00 TL')).toBeOnTheScreen());

    await applyCoupon();
    await waitFor(() => expect(screen.getByText('145,00 TL')).toBeOnTheScreen());

    // Üç satır: 80 + 50 + 15 = 145 = Toplam. Araya bir "İndirim" satırı girerse
    // (eski davranış) satırlar toplamı tutmaz — kullanıcı 20 TL'lik açıklanamayan
    // bir fark görürdü.
    expect(screen.getByText('80,00 TL')).toBeOnTheScreen();
    expect(screen.getByText('50,00 TL')).toBeOnTheScreen();
    expect(screen.getByText('15,00 TL')).toBeOnTheScreen();
    expect(screen.queryByText('İndirim (INDIRIM10)')).toBeNull();
    expect(screen.queryByTestId('order-summary-discount')).toBeNull();

    // `/discounts/validate`'in estimatedDiscount'u (18) HİÇBİR para gösteriminde
    // kullanılmaz — ne özet satırında ne rozette.
    expect(screen.queryByText('18,00 TL')).toBeNull();

    // İndirim yalnız rozette, quote KÖKÜNDEKİ couponDiscount (20) ile.
    expect(screen.getByText(/INDIRIM10 uygulandı · −20,00 TL/)).toBeOnTheScreen();
  });

  it('400 "Kupon kodu bulunamadı" checkout u kilitlemez: kupon düşer, quote kuponsuz yenilenir', async () => {
    // couponCode'lu her getQuote çağrısı 400 döndürsün (kupon quote'ta geçersiz).
    (jest.mocked(ordersApi.getQuote) as unknown as jest.Mock).mockImplementation((data: any) =>
      data?.couponCode ? Promise.reject(REJECT_COUPON) : Promise.resolve(NO_COUPON_RESPONSE),
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
    // ekran çalışır durumda kalır (hâlâ "Devam Et" ile ilerlenebilir) ve fiyat
    // hatası ekranı GÖSTERİLMEZ (kuponsuz sonuç önden cache'e yazıldı).
    await waitFor(() => expect(screen.getByText('165,00 TL')).toBeOnTheScreen());
    expect(screen.getByText('Devam Et')).toBeOnTheScreen();
    expect(screen.queryByTestId('order-summary-error')).toBeNull();
  });

  it('aynı geçersiz kod ikinci kez uygulanınca uyarı YİNE çıkar (önbellek zehirlenmez)', async () => {
    (jest.mocked(ordersApi.getQuote) as unknown as jest.Mock).mockImplementation((data: any) =>
      data?.couponCode ? Promise.reject(REJECT_COUPON) : Promise.resolve(NO_COUPON_RESPONSE),
    );

    renderWithProviders(<CheckoutScreen />);
    await waitFor(() => expect(screen.getByText('165,00 TL')).toBeOnTheScreen());

    await applyCoupon();
    await waitFor(() => expect(appAlert).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByTestId('coupon-input')).toBeOnTheScreen());

    // İkinci deneme — staleTime 60 sn içinde, aynı kod. Kuponsuz sonuç kuponlu
    // anahtar altına yazılsaydı istek hiç gitmez ve uyarı çıkmazdı.
    await applyCoupon();
    await waitFor(() => expect(appAlert).toHaveBeenCalledTimes(2));
    expect(jest.mocked(appAlert).mock.calls[1]).toEqual(['Kupon Geçersiz', 'Kupon kodu bulunamadı']);

    // Ve ekran hâlâ kullanılabilir, toplam indirimsiz.
    await waitFor(() => expect(screen.getByText('165,00 TL')).toBeOnTheScreen());
    expect(screen.queryByTestId('coupon-applied')).toBeNull();
  });
});
