/**
 * P2 #9 — mesafeli satış sözleşmesi onayı.
 *
 * Onay kutusu checkout'ta HİÇ yoktu. Sunucu tarafı dışarıdan doğrulanamıyor
 * (uç bilinmeyen alanları reddetmiyor: `zzzUydurmaAlan` ile
 * `distanceSalesAccepted` gönderilen iki istek birebir aynı 400'ü döndürdü,
 * 2026-08-11 ölçümü), ama kutunun kendisi ve ödemeyi kapatması tamamen
 * istemci tarafı ve gözlemlenebilir.
 *
 * Alan İLK çağrıda gitmeli: idempotency replay'i sonradan gelen onayı
 * işlemez, aynı anahtarla ikinci istek ilk yanıtı tekrarlar.
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
  toExpectedPricing: jest.requireActual('@/lib/api').toExpectedPricing,
  ordersApi: {
    checkout: jest.fn(() =>
      Promise.resolve({ data: { data: { checkoutGroupId: 'g1', orders: [{ orderId: 'o1' }] } } }),
    ),
    getQuote: jest.fn(() =>
      Promise.resolve({
        data: {
          pricingHash: 'h1',
          shippingTariffVersion: 3,
          commissionRuleSetId: 'rs-1',
          commissionRuleSetVersion: 7,
          pricing: { summary: { productAmount: 100, shippingAmount: 50, serviceFeeAmount: 15, total: 165 } },
        },
      }),
    ),
  },
  paymentsApi: {
    getPaymentMethods: jest.fn(() => Promise.resolve({ data: [] })),
    initiateGroup: jest.fn(() => Promise.resolve({ data: { data: { useBypass: true, paymentId: 'p1' } } })),
    initiateGroupGuest: jest.fn(),
    bypassComplete: jest.fn(() => Promise.resolve({ data: {} })),
  },
  addressesApi: { getAll: jest.fn(() => Promise.resolve({ data: ONE_ADDRESS })) },
  discountsApi: { validate: jest.fn() },
  cartApi: { clear: jest.fn(), get: jest.fn(() => Promise.resolve({ data: null })) },
}));

jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (state: any) => unknown) => {
    const state: any = { isAuthenticated: true, user: { id: 'u1', email: 'member@example.com' } };
    return sel ? sel(state) : state;
  },
}));

import { ordersApi } from '@/lib/api';
import { useCartStore } from '@/stores/cartStore';
import CheckoutScreen from '../index';

const PID = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';

const seed = () =>
  useCartStore.setState({
    items: [
      {
        id: 'cart-1',
        productId: PID,
        title: 'Test Model',
        price: 100,
        quantity: 1,
        imageUrl: 'https://x/y.jpg',
        seller: { id: 's1', displayName: 'Satıcı' },
        addedAt: Date.now(),
      } as any,
    ],
    deselectedIds: [],
    lastUpdated: Date.now(),
  });

/** Onay adımına kadar ilerler (ödemeye basmadan). */
async function reachConfirmStep() {
  await waitFor(() => expect(screen.getByText('Ali Veli')).toBeOnTheScreen());
  fireEvent.press(screen.getByText('Ali Veli'));
  fireEvent.press(screen.getByText('Devam Et'));
  await waitFor(() => expect(screen.getByText('Kargo Seçimi')).toBeOnTheScreen());
  fireEvent.press(screen.getByText('Devam Et'));
  await waitFor(() => expect(screen.getByText(/Onayla ve Öde/)).toBeOnTheScreen());
}

describe('Checkout · mesafeli satış sözleşmesi onayı', () => {
  beforeEach(() => {
    jest.mocked(ordersApi.checkout).mockClear();
    seed();
  });

  afterEach(() => {
    useCartStore.setState({ items: [], deselectedIds: [] });
  });

  it('onay verilmeden ödeme butonu kapalıdır', async () => {
    renderWithProviders(<CheckoutScreen />);
    await reachConfirmStep();

    expect(screen.getByTestId('checkout-pay-button')).toBeDisabled();
  });

  it('onay verilince ödeme açılır', async () => {
    renderWithProviders(<CheckoutScreen />);
    await reachConfirmStep();

    fireEvent.press(screen.getByTestId('checkout-distance-sales-checkbox'));

    await waitFor(() => expect(screen.getByTestId('checkout-pay-button')).not.toBeDisabled());
  });

  it('onay İLK çağrının gövdesinde gider', async () => {
    renderWithProviders(<CheckoutScreen />);
    await reachConfirmStep();

    fireEvent.press(screen.getByTestId('checkout-distance-sales-checkbox'));
    await act(async () => {
      fireEvent.press(screen.getByText(/Onayla ve Öde/));
    });

    await waitFor(() => expect(ordersApi.checkout).toHaveBeenCalled());
    const payload = jest.mocked(ordersApi.checkout).mock.calls[0]![0] as any;
    expect(payload.distanceSalesAccepted).toBe(true);
  });
});
