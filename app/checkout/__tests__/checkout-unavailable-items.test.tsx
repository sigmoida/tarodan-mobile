/**
 * checkout-unavailable-items · kısmi quote (delta 18 §1).
 *
 * Quote 200 ile fiyatlanan ve fiyatlanmayan satırları birlikte döndürebilir.
 * Ayrılan satır gerekçesiyle gösterilir; toplam YİNE `pricing.summary.total`'dır
 * — ayrılan satırlardan istemcide toplam türetilmez.
 */
import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-router', () => require('@/test-utils/router-mock').routerMock);

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

const QUOTE_PARTIAL = {
  pricingHash: 'h1',
  shippingTariffVersion: 4,
  commissionRuleSetId: 'rs-1',
  commissionRuleSetVersion: 7,
  items: [{ productId: 'p1', quantity: 1, subtotal: 100 }],
  unavailableItems: [
    { productId: 'p2', sellerId: 's2', code: 'SELLER_SALES_SUSPENDED', message: 'Satıcı askıda' },
    { productId: 'p3', code: 'BRAND_NEW_CODE', message: 'Sunucudan gelen ham gerekçe' },
  ],
  pricing: { summary: { productAmount: 100, shippingAmount: 30, serviceFeeAmount: 20, total: 150 } },
};

// Kısmi quote ödeme YAPMADAN görünür — üçüncü adıma kadar ilerlemek yeterli.
async function openCheckout() {
  renderWithProviders(<CheckoutScreen />);
  await waitFor(() => expect(screen.getByText('Ali Veli')).toBeOnTheScreen());
  fireEvent.press(screen.getByText('Ali Veli'));
}

beforeEach(() => {
  jest.mocked(ordersApi.getQuote).mockReset();
  seedCart([SAMPLE_ITEM]);
});
afterEach(() => useCartStore.setState({ items: [] }));

it('ayrılan satırın gerekçesini gösterir ve toplamı summary.total olarak basar', async () => {
  jest.mocked(ordersApi.getQuote).mockResolvedValue({ data: QUOTE_PARTIAL } as any);

  await openCheckout();

  expect(await screen.findByText('Satıcının satış yetkisi şu an geçerli değil.')).toBeTruthy();
  // Bilinmeyen kodda sunucunun ham mesajı basılır (ileri uyum).
  expect(screen.getByText('Sunucudan gelen ham gerekçe')).toBeTruthy();
  // Toplam ayrılan satırlardan türetilmedi — summary.total aynen.
  expect(screen.getByText('150,00 TL')).toBeTruthy();
});

it('unavailableItems boşsa hiçbir uyarı bölümü çizilmez', async () => {
  jest.mocked(ordersApi.getQuote).mockResolvedValue({
    data: { ...QUOTE_PARTIAL, unavailableItems: [] },
  } as any);

  await openCheckout();
  await waitFor(() => expect(ordersApi.getQuote).toHaveBeenCalled());

  expect(screen.queryByText('Bu ürünler ödemeye dahil edilmedi')).toBeNull();
});
