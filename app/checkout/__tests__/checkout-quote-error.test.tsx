/**
 * checkout-quote-error · quote hata verdiğinde ekran KİLİTLENMEZ.
 *
 * Eski davranış (bulgu I2): `total = Number(summary?.total ?? 0)` yüzünden hata
 * halinde butonda "Onayla ve Öde (0,00 TL)" yazıyordu ve buton ETKİNDİ —
 * TanStack Query v5'te `isLoading = isPending && isFetching`, yani hata halinde
 * `false`, dolayısıyla `disabled={loading || quoteLoading}` savunması düşüyordu.
 * Basınca guard "Fiyat bilgisi yükleniyor…" diyordu ama hiçbir şey yüklenmiyordu:
 * `retry` tükendikten sonra `refetchOnWindowFocus: false` olduğu için sorgu
 * kendiliğinden tazelenmiyor ve ekranda retry düğmesi yoktu (CLAUDE.md §11).
 *
 * Beklenen: ErrorState + "Tekrar Dene" (paylaşılan primitive), butonda TUTAR
 * BASILMAZ ve buton devre dışı; retry başarılı olunca ekran normale döner.
 */
import React from 'react';
import { screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-router', () => require('@/test-utils/router-mock').routerMock);

const ONE_ADDRESS = [
  {
    id: 'addr-1',
    fullName: 'Ali Veli',
    phone: '+905321234567',
    city: 'İstanbul',
    district: 'Kadıköy',
    address: 'Test Sokak No:1',
    isDefault: true,
  },
];

jest.mock('@/lib/api', () => ({
  ordersApi: { checkout: jest.fn(), getQuote: jest.fn() },
  paymentsApi: {
    getPaymentMethods: jest.fn(() => Promise.resolve({ data: [] })),
    initiateGroup: jest.fn(),
    initiateGroupGuest: jest.fn(),
    bypassComplete: jest.fn(),
  },
  addressesApi: { getAll: jest.fn(() => Promise.resolve({ data: ONE_ADDRESS })) },
  discountsApi: { validate: jest.fn() },
  cartApi: { clear: jest.fn(() => Promise.resolve()) },
}));

jest.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({ isAuthenticated: true, user: { id: 'u1', email: 'member@example.com' } }),
}));

import { ordersApi } from '@/lib/api';
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

const GOOD_QUOTE = {
  data: {
    pricingHash: 'hash-ok',
    shippingTariffVersion: 3,
    pricing: { summary: { productAmount: 100, shippingAmount: 50, serviceFeeAmount: 15, total: 165 } },
  },
};

/** Üye akışında adım 3'e (Onayla ve Öde) kadar ilerle. */
async function goToStep3() {
  await waitFor(() => expect(screen.getByText('Ali Veli')).toBeOnTheScreen());
  fireEvent.press(screen.getByText('Ali Veli'));
  fireEvent.press(screen.getByText('Devam Et'));
  await waitFor(() => expect(screen.getByText('Kargo Seçimi')).toBeOnTheScreen());
  fireEvent.press(screen.getByText('Devam Et'));
  await waitFor(() => expect(screen.getByText(/Onayla ve Öde/)).toBeOnTheScreen());
}

describe('Quote hatası — checkout kilitlenmez', () => {
  beforeEach(() => {
    jest.mocked(ordersApi.checkout).mockReset();
    jest.mocked(ordersApi.getQuote).mockReset();
    seedCart([SAMPLE_ITEM]);
  });

  afterEach(() => {
    useCartStore.setState({ items: [] });
  });

  it('hata halinde ErrorState + Tekrar Dene gösterilir, tutar basılmaz, buton devre dışı', async () => {
    // Kupon UYGULANMAMIŞKEN gelen 400 — kupona yorulmamalı (bulgu M1) ve 4xx
    // olduğu için yeniden denenmemeli (bulgu I4'ün retry ayarı).
    (jest.mocked(ordersApi.getQuote) as unknown as jest.Mock).mockRejectedValue({
      response: { status: 400, data: { message: 'Geçersiz ürün' } },
    });

    renderWithProviders(<CheckoutScreen />);
    await goToStep3();

    // Özet kartı yerine ErrorState + retry düğmesi.
    await waitFor(() => expect(screen.getByTestId('order-summary-error')).toBeOnTheScreen());
    expect(screen.getByText('Tekrar Dene')).toBeOnTheScreen();

    // Ekranın HİÇBİR yerinde uydurma "0,00 TL" yok — ne özet satırlarında ne
    // butonda. (Tam eşleşme: "100,00 TL" gibi gerçek satır fiyatları regex ile
    // yanlışlıkla eşleşiyordu.)
    expect(screen.queryByText('0,00 TL')).toBeNull();
    // Buton tutarsız: parantezli tutar basılmıyor.
    expect(screen.getByText('Onayla ve Öde')).toBeOnTheScreen();

    // Kupon dışı 400 kupona yorulmadı — "Kupon Geçersiz" başlığı YOK.
    expect(screen.queryByText(/Kupon Geçersiz/)).toBeNull();

    // Devre dışı: basınca sipariş oluşturma denenmez.
    await act(async () => {
      fireEvent.press(screen.getByText('Onayla ve Öde'));
    });
    expect(ordersApi.checkout).not.toHaveBeenCalled();
  });

  it('"Tekrar Dene" quote u yeniden çeker; başarılı olunca tutar ve buton geri gelir', async () => {
    (jest.mocked(ordersApi.getQuote) as unknown as jest.Mock)
      .mockRejectedValueOnce({ response: { status: 400, data: { message: 'Geçersiz ürün' } } })
      .mockResolvedValue(GOOD_QUOTE);

    renderWithProviders(<CheckoutScreen />);
    await goToStep3();

    await waitFor(() => expect(screen.getByTestId('order-summary-error')).toBeOnTheScreen());

    await act(async () => {
      fireEvent.press(screen.getByText('Tekrar Dene'));
    });

    // Önce POZİTİF sonucu bekle: refetch + rerender yüklü makinede 1 sn'lik
    // varsayılan `waitFor` penceresini aşabiliyordu ve "hata kartı kayboldu mu"
    // negatif iddiası daha tazeyken düşüyordu (flake — bu turdan önce de vardı).
    await waitFor(() => expect(screen.getByText('165,00 TL')).toBeOnTheScreen(), { timeout: 5000 });
    expect(screen.queryByTestId('order-summary-error')).toBeNull();
    expect(screen.getByText(/Onayla ve Öde \(165,00 TL\)/)).toBeOnTheScreen();
  });
});
