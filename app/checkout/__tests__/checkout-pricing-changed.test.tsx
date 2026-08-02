/**
 * checkout-pricing-changed · 409 PRICING_CHANGED akışı (task-1 brief 1e).
 *
 * Ayırt edici alanlar: `status === 409` + `response.data.i18nKey ===
 * 'server.shipping.pricingChanged'` — `code`/`errorCode` alanı YOK. Davranış:
 * quote'u yenile, eski/yeni toplamı göster, kullanıcıdan yeniden onay al.
 *
 * Üye (authenticated) akışı kullanılır: OTP modalı açık değilken
 * `alertRespectingOtpModal` doğrudan `appAlert`'i çağırır (`@/ui`'den), bu da
 * burada mock'lanıp doğrulanabilir. Misafir + OTP-modal-açıkken dalı
 * `alertAfterClose` üzerinden (modal önce kapanır) aynı `appAlert`'e gider —
 * ayrı bir iOS-donma testi olmadan, kod yolu burada dolaylı olarak kanıtlanır.
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
  ordersApi: {
    checkout: jest.fn(),
    getQuote: jest.fn(),
    getGroups: jest.fn(),
  },
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

import { appAlert } from '@/ui';
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

const OLD_QUOTE = {
  pricingHash: 'hash-old',
  shippingTariffVersion: 3,
  pricing: { summary: { productAmount: 100, shippingAmount: 50, serviceFeeAmount: 15, total: 165 } },
};
const NEW_QUOTE = {
  pricingHash: 'hash-new',
  shippingTariffVersion: 3,
  pricing: { summary: { productAmount: 100, shippingAmount: 80, serviceFeeAmount: 15, total: 195 } },
};

describe('409 PRICING_CHANGED', () => {
  beforeEach(() => {
    jest.mocked(appAlert).mockClear();
    jest.mocked(ordersApi.checkout).mockReset();
    jest.mocked(ordersApi.getQuote)
      .mockReset()
      .mockResolvedValueOnce({ data: OLD_QUOTE } as any)
      .mockResolvedValue({ data: NEW_QUOTE } as any);
    seedCart([SAMPLE_ITEM]);
  });

  afterEach(() => {
    useCartStore.setState({ items: [] });
  });

  it('quote yenilenir, eski/yeni toplam appAlert ile gösterilir, checkout tekrar denenmez', async () => {
    jest.mocked(ordersApi.checkout).mockRejectedValueOnce({
      response: { status: 409, data: { i18nKey: 'server.shipping.pricingChanged' } },
    });

    renderWithProviders(<CheckoutScreen />);

    // Kayıtlı adres yüklenince satırı doğrudan seç — otomatik-seçim efektinin
    // zamanlamasına bağımlı kalmamak için (validateStep1 inline adres ister).
    await waitFor(() => expect(screen.getByText('Ali Veli')).toBeOnTheScreen());
    fireEvent.press(screen.getByText('Ali Veli'));

    fireEvent.press(screen.getByText('Devam Et')); // step1 → step2
    await waitFor(() => expect(screen.getByText('Kargo Seçimi')).toBeOnTheScreen());
    fireEvent.press(screen.getByText('Devam Et')); // step2 → step3
    await waitFor(() => expect(screen.getByText(/Onayla ve Öde/)).toBeOnTheScreen());

    await act(async () => {
      fireEvent.press(screen.getByText(/Onayla ve Öde/));
    });

    // checkout 409 döndü → quote yenilendi (2. getQuote çağrısı) ve appAlert
    // eski (165,00 TL) ile yeni (195,00 TL) toplamı gösterdi.
    await waitFor(() => expect(ordersApi.getQuote).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(appAlert).toHaveBeenCalled());

    const [title, message] = jest.mocked(appAlert).mock.calls[0];
    expect(title).toBe('Fiyatlar Güncellendi');
    expect(message).toEqual(expect.stringContaining('165,00 TL'));
    expect(message).toEqual(expect.stringContaining('195,00 TL'));

    // Kullanıcı yeniden onay vermeden checkout tekrar denenmedi.
    expect(ordersApi.checkout).toHaveBeenCalledTimes(1);
  });
});
