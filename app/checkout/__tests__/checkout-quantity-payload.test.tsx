/**
 * checkout-quantity-payload · Sipariş gövdesi quote ile AYNI adetleri taşır (Parite A-1.1).
 *
 * Canlı hata: quote `{ productId, quantity }` ile isteniyor, checkout gövdesi
 * yalnız `{ productId }` gönderiyordu. Sunucu `quantity ?? 1` varsayıyor ve
 * fiyat imzasına (`pricingHash`) adedi katıyor → adedi 1'den büyük her sepet
 * imza tutmadığı için 409 `pricingChanged` döngüsüne düşüyordu.
 *
 * Kilitlenen sözleşme: üye ve misafir checkout gövdesinin `items`'ı, aynı
 * sepetin quote isteğindeki `items` ile BİREBİR aynıdır (adet dahil).
 * Misafir yolunun karşılığı `checkout-otp.test.tsx`'te.
 */
import React from 'react';
import { screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';

// B4: kimlik kapısı bu testin konusu değil — geçti say (kapı testi ayrı dosyada).
jest.mock('@/hooks/useLegalIdentity', () =>
  require('@/test-utils/legalIdentity').legalIdentityGatePassMock,
);

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
          pricingHash: '70a8bdadff29af70',
          shippingTariffVersion: 3,
          commissionRuleSetId: 'rs-1',
          commissionRuleSetVersion: 7,
          pricing: { summary: { productAmount: 400, shippingAmount: 50, serviceFeeAmount: 15, total: 465 } },
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
    const state: any = { isAuthenticated: true, user: { id: 'u1', email: 'member@example.com' } };
    return sel ? sel(state) : state;
  },
}));

import { ordersApi } from '@/lib/api';
import { useCartStore } from '@/stores/cartStore';
import CheckoutScreen from '../index';

const P1 = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
const P2 = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb';

const line = (productId: string, quantity: number) => ({
  id: `cart-${productId}`,
  productId,
  title: `Ürün ${productId.slice(0, 4)}`,
  price: 100,
  quantity,
  stock: 10,
  imageUrl: 'https://x/y.jpg',
  seller: { id: 's1', displayName: 'Satıcı' },
  addedAt: Date.now(),
});

function acceptDistanceSales() {
  const box = screen.queryByTestId('checkout-distance-sales-checkbox');
  if (box) fireEvent.press(box);
}

describe('Checkout · adet quote ile aynı gönderilir (A-1.1)', () => {
  beforeEach(() => {
    jest.mocked(ordersApi.checkout).mockClear();
    jest.mocked(ordersApi.getQuote).mockClear();
    useCartStore.setState({
      items: [line(P1, 3), line(P2, 1)],
      deselectedIds: [],
      lastUpdated: Date.now(),
    });
  });

  afterEach(() => {
    useCartStore.setState({ items: [], deselectedIds: [] });
  });

  it('üye checkout gövdesi her satırın adedini taşır ve quote satırlarıyla birebir aynıdır', async () => {
    renderWithProviders(<CheckoutScreen />);

    await waitFor(() => expect(screen.getByText('Ali Veli')).toBeOnTheScreen());
    fireEvent.press(screen.getByText('Ali Veli'));
    fireEvent.press(screen.getByText('Devam Et'));
    await waitFor(() => expect(screen.getByText('Kargo Seçimi')).toBeOnTheScreen());
    fireEvent.press(screen.getByText('Devam Et'));
    await waitFor(() => expect(screen.getByText(/Onayla ve Öde/)).toBeOnTheScreen());

    acceptDistanceSales();
    await act(async () => {
      fireEvent.press(screen.getByText(/Onayla ve Öde/));
    });

    await waitFor(() => expect(ordersApi.checkout).toHaveBeenCalledTimes(1));
    const payload = jest.mocked(ordersApi.checkout).mock.calls[0]![0] as any;

    // Gövde tam olarak bu: adet düşmez, fazladan satır alanı (fiyat/başlık) sızmaz.
    expect(payload.items).toEqual([
      { productId: P1, quantity: 3 },
      { productId: P2, quantity: 1 },
    ]);

    // İmzanın üretildiği quote isteğiyle AYNI satırlar — ayrışırsa sunucu 409 döner.
    const quoteBody = jest.mocked(ordersApi.getQuote).mock.calls.at(-1)![0];
    expect(payload.items).toEqual(quoteBody.items);
  });
});
