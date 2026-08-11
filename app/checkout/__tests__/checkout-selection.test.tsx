/**
 * P2 #10 + #11 — seçili satırlarla ödeme ve ödeme sonrası sepet.
 *
 * #10: checkout sepetin TAMAMINI değil, kullanıcının seçtiği satırları
 * ödemeli. Uç zaten yalnız gönderilen `items`'ı fiyatlıyor.
 *
 * #11: ödeme bitince `DELETE /cart` ÇAĞRILMAMALI. Sunucu satın alınan
 * satırları transaction içinde zaten siliyor; tüm sepeti silmek, seçim
 * özelliğiyle birlikte doğrudan veri kaybı olur — üç satırdan birini alan
 * kullanıcının diğer ikisi uçardı. Doğrusu: yerelde yalnız satın alınanları
 * düş, sunucu sepetini yeniden çek.
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
  cartApi: { clear: jest.fn(() => Promise.resolve()), get: jest.fn(() => Promise.resolve({ data: null })) },
}));

jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (state: any) => unknown) => {
    const state: any = { isAuthenticated: true, user: { id: 'u1', email: 'member@example.com' } };
    return sel ? sel(state) : state;
  },
}));

import { ordersApi, cartApi } from '@/lib/api';
import { useCartStore } from '@/stores/cartStore';
import CheckoutScreen from '../index';

const P1 = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
const P2 = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb';
const P3 = 'cccccccc-3333-4333-8333-cccccccccccc';

const line = (productId: string, title: string) => ({
  id: `cart-${productId}`,
  productId,
  title,
  price: 100,
  quantity: 1,
  imageUrl: 'https://x/y.jpg',
  seller: { id: 's1', displayName: 'Satıcı' },
  addedAt: Date.now(),
});

/** Adres → kargo → onay adımlarını geçip ödemeyi tetikler. */
async function payThrough() {
  await waitFor(() => expect(screen.getByText('Ali Veli')).toBeOnTheScreen());
  fireEvent.press(screen.getByText('Ali Veli'));
  fireEvent.press(screen.getByText('Devam Et'));
  await waitFor(() => expect(screen.getByText('Kargo Seçimi')).toBeOnTheScreen());
  fireEvent.press(screen.getByText('Devam Et'));
  await waitFor(() => expect(screen.getByText(/Onayla ve Öde/)).toBeOnTheScreen());
  await act(async () => {
    fireEvent.press(screen.getByText(/Onayla ve Öde/));
  });
}

describe('Checkout · seçili satırlar ve ödeme sonrası sepet', () => {
  beforeEach(() => {
    jest.mocked(ordersApi.checkout).mockClear();
    jest.mocked(cartApi.clear).mockClear();
    useCartStore.setState({
      items: [line(P1, 'Birinci'), line(P2, 'İkinci'), line(P3, 'Üçüncü')],
      // Kullanıcı ikinci satırı seçimden çıkarmış.
      deselectedIds: [`cart-${P2}`],
      lastUpdated: Date.now(),
    });
  });

  afterEach(() => {
    useCartStore.setState({ items: [], deselectedIds: [] });
  });

  it('yalnız seçili satırlar ödenir', async () => {
    renderWithProviders(<CheckoutScreen />);
    await waitFor(() => expect(screen.getByText('Ali Veli')).toBeOnTheScreen());
    fireEvent.press(screen.getByText('Ali Veli'));
    fireEvent.press(screen.getByText('Devam Et'));
    await waitFor(() => expect(screen.getByText('Kargo Seçimi')).toBeOnTheScreen());
    fireEvent.press(screen.getByText('Devam Et'));
    await waitFor(() => expect(screen.getByText(/Onayla ve Öde/)).toBeOnTheScreen());
    // eslint-disable-next-line no-console

    await act(async () => {
      fireEvent.press(screen.getByText(/Onayla ve Öde/));
    });

    await waitFor(() => expect(ordersApi.checkout).toHaveBeenCalled());
    const payload = jest.mocked(ordersApi.checkout).mock.calls[0]![0] as any;
    expect(payload.items.map((i: any) => i.productId)).toEqual([P1, P3]);
  });

  it('ödeme sonrası tüm sunucu sepeti SİLİNMEZ', async () => {
    renderWithProviders(<CheckoutScreen />);
    await payThrough();

    await waitFor(() => expect(ordersApi.checkout).toHaveBeenCalled());
    expect(cartApi.clear).not.toHaveBeenCalled();
  });

  it('ödeme sonrası yerelde yalnız satın alınan satırlar düşer', async () => {
    renderWithProviders(<CheckoutScreen />);
    await payThrough();

    await waitFor(() => expect(useCartStore.getState().items.map((i) => i.productId)).toEqual([P2]));
  });
});
