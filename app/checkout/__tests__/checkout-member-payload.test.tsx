/**
 * checkout-member-payload · ÜYE çağrı yerinin sözleşme alanları (bulgu M2).
 *
 * `expectedPricingHash` + `expectedShippingTariffVersion` API DTO'sunda ZORUNLU.
 * `src/lib/api/__tests__/orders.test.ts` yalnız payload üreticisinin alanları
 * alt katmana geçirdiğini gösterir (tip zaten zorunlu kılıyor); asıl güvence
 * ÇAĞRI YERİNİN quote kökünden gerçekten okuyup göndermesidir. Misafir yolu
 * `checkout-otp.test.tsx`'te iddia ediliyordu — üye yolu için karşılığı buydu.
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
  ordersApi: {
    checkout: jest.fn(() =>
      Promise.resolve({ data: { data: { checkoutGroupId: 'g1', orders: [{ orderId: 'o1' }] } } }),
    ),
    // Sözleşme alanları quote KÖKÜNDEN gelir (`pricing` içinden değil).
    getQuote: jest.fn(() =>
      Promise.resolve({
        data: {
          pricingHash: '70a8bdadff29af70',
          shippingTariffVersion: 3,
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
  cartApi: { clear: jest.fn(() => Promise.resolve()) },
}));

jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (state: any) => unknown) => {
    const state: any = ({ isAuthenticated: true, user: { id: 'u1', email: 'member@example.com' } });
    return sel ? sel(state) : state;
  },
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

describe('Üye checkout payload sözleşmesi', () => {
  beforeEach(() => {
    jest.mocked(ordersApi.checkout).mockClear();
    seedCart([SAMPLE_ITEM]);
  });

  afterEach(() => {
    useCartStore.setState({ items: [] });
  });

  it('ordersApi.checkout quote kökündeki iki sözleşme alanını AYNEN gönderir', async () => {
    renderWithProviders(<CheckoutScreen />);

    await waitFor(() => expect(screen.getByText('Ali Veli')).toBeOnTheScreen());
    fireEvent.press(screen.getByText('Ali Veli'));
    fireEvent.press(screen.getByText('Devam Et'));
    await waitFor(() => expect(screen.getByText('Kargo Seçimi')).toBeOnTheScreen());
    fireEvent.press(screen.getByText('Devam Et'));
    await waitFor(() => expect(screen.getByText(/Onayla ve Öde/)).toBeOnTheScreen());

    await act(async () => {
      fireEvent.press(screen.getByText(/Onayla ve Öde/));
    });

    await waitFor(() => {
      expect(ordersApi.checkout).toHaveBeenCalledWith(
        expect.objectContaining({
          expectedPricingHash: '70a8bdadff29af70',
          expectedShippingTariffVersion: 3,
        }),
      );
    });

    // Koşulsuz gönderilir (web'in "yalnız doluysa gönder" hatası tekrarlanmaz):
    // alanlar payload'da her zaman var.
    const payload = jest.mocked(ordersApi.checkout).mock.calls[0][0];
    expect(Object.keys(payload)).toEqual(
      expect.arrayContaining(['expectedPricingHash', 'expectedShippingTariffVersion']),
    );
  });
});
