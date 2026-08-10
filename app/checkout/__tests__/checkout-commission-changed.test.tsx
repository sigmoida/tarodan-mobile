/**
 * checkout-commission-changed · 409 COMMISSION_PRICING_CHANGED ve 503 (delta 18 §1).
 *
 * `PRICING_CHANGED` i18nKey ile ayırt ediliyordu; komisyon çakışması ise
 * `response.data.code === 'COMMISSION_PRICING_CHANGED'` ile gelir. İkisi de aynı
 * dala iner: quote yenilenir, yeni toplam gösterilir, yeniden onay istenir —
 * sessiz otomatik retry YOK.
 *
 * `503` AYRI davranıştır: yeniden quote'la çözülmez, kullanıcı quote döngüsüne
 * sokulmaz.
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
  toExpectedPricing: jest.requireActual('@/lib/api').toExpectedPricing,
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
  useAuthStore: (sel?: (state: any) => unknown) => {
    const state: any = ({ isAuthenticated: true, user: { id: 'u1', email: 'member@example.com' } });
    return sel ? sel(state) : state;
  },
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

const QUOTE = {
  pricingHash: 'hash-old',
  shippingTariffVersion: 3,
  commissionRuleSetId: 'rs-1',
  commissionRuleSetVersion: 7,
  pricing: { summary: { productAmount: 100, shippingAmount: 30, serviceFeeAmount: 20, total: 150 } },
  items: [{ productId: 'p1', quantity: 1, subtotal: 100 }],
};

async function payThroughCheckout() {
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
}

describe('409 COMMISSION_PRICING_CHANGED ve 503', () => {
  beforeEach(() => {
    jest.mocked(appAlert).mockClear();
    jest.mocked(ordersApi.checkout).mockReset();
    jest.mocked(ordersApi.getQuote).mockReset();
    seedCart([SAMPLE_ITEM]);
  });
  afterEach(() => useCartStore.setState({ items: [] }));

  it('409 COMMISSION_PRICING_CHANGED: quote yenilenir ve yeniden onay istenir', async () => {
    jest.mocked(ordersApi.getQuote)
      .mockResolvedValueOnce({ data: QUOTE } as any)
      .mockResolvedValueOnce({
        data: { ...QUOTE, commissionRuleSetVersion: 8, pricing: { summary: { ...QUOTE.pricing.summary, total: 165 } } },
      } as any);
    jest.mocked(ordersApi.checkout).mockRejectedValueOnce({
      response: { status: 409, data: { code: 'COMMISSION_PRICING_CHANGED' } },
    });

    await payThroughCheckout();

    await waitFor(() => expect(ordersApi.getQuote).toHaveBeenCalledTimes(2));
    expect(appAlert).toHaveBeenCalled();
    // Sessiz retry YOK: checkout ikinci kez çağrılmadı.
    expect(ordersApi.checkout).toHaveBeenCalledTimes(1);
  });

  it('503: quote yenilenmez, ayrı mesaj basılır', async () => {
    jest.mocked(ordersApi.getQuote).mockReset().mockResolvedValue({ data: QUOTE } as any);
    jest.mocked(ordersApi.checkout).mockRejectedValueOnce({ response: { status: 503, data: {} } });

    await payThroughCheckout();

    await waitFor(() => expect(appAlert).toHaveBeenCalled());
    const [title] = jest.mocked(appAlert).mock.calls[0];
    expect(title).toBe('Ödeme şu an alınamıyor');
    // Kullanıcı sonsuz quote döngüsüne sokulmadı.
    expect(ordersApi.getQuote).toHaveBeenCalledTimes(1);
  });
});
