/**
 * checkout-amount-shape · tutar alanlarının ŞEKLİ (bulgu N2) ve satır tutarının
 * kaynağı (bulgu N1).
 *
 * N2 — I2 turunda konan kapı NESNE seviyesindeydi: `summary != null ? Number(...)`.
 * `Number(null)` = 0 ve `Number(undefined)` = NaN olduğu için `summary` gelip
 * alanı boş dönen bir yanıt I2'nin öldürdüğü senaryoyu geri getiriyordu:
 * "Onayla ve Öde (0,00 TL)" yazan ETKİN bir buton. Kapı artık alan seviyesinde.
 *
 * N1 — satır tutarı `item.price * item.quantity` ile İSTEMCİDE çarpılıyordu.
 * Sepetteki `price` ekleme anında donuyor (24 saat) ve ürünlerde kampanya
 * penceresi var (`isOnSale`/`saleEndDate`); pencere sepette beklerken kapanınca
 * satır eski indirimli fiyatı, özet yeni ara toplamı gösteriyordu — C1'in yok
 * ettiği "satırlar toplamı tutmuyor" sınıfının bir kat aşağısı. Artık sunucunun
 * `items[].subtotal`'ı basılıyor.
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

const mocked = (fn: unknown) => fn as unknown as jest.Mock;

// Kampanya senaryosu: sepete 619,92 TL'ye eklendi (isOnSale), kampanya sepette
// beklerken bitti ve sunucu artık 885,60 TL diyor.
const CART_ITEM = {
  id: 'cart-1',
  productId: 'prod-1234567890',
  title: 'Hot Wheels Ferrari 275 GTB',
  price: 619.92,
  quantity: 2,
  imageUrl: 'https://x/y.jpg',
  brand: 'Hot Wheels',
  scale: '1:64',
  seller: { id: 's1', displayName: 'Satıcı' },
  addedAt: Date.now(),
};

const quoteWithSummary = (summary: Record<string, unknown>, items?: unknown[]) => ({
  data: {
    pricingHash: 'hash-1',
    shippingTariffVersion: 3,
    ...(items ? { items } : {}),
    pricing: { summary },
  },
});

async function goToStep3() {
  await waitFor(() => expect(screen.getByText('Ali Veli')).toBeOnTheScreen());
  fireEvent.press(screen.getByText('Ali Veli'));
  fireEvent.press(screen.getByText('Devam Et'));
  await waitFor(() => expect(screen.getByText('Kargo Seçimi')).toBeOnTheScreen());
  fireEvent.press(screen.getByText('Devam Et'));
  await waitFor(() => expect(screen.getByText(/Onayla ve Öde/)).toBeOnTheScreen());
}

describe('N2 · tutar alanı sayı değilse tutar YOK sayılır', () => {
  beforeEach(() => {
    mocked(ordersApi.checkout).mockReset();
    mocked(ordersApi.getQuote).mockReset();
    useCartStore.setState({ items: [CART_ITEM], lastUpdated: Date.now() });
  });

  afterEach(() => {
    useCartStore.setState({ items: [] });
  });

  // `Number(null)` = 0 → eski kod bunu geçerli bir 0 sanıyordu.
  it('summary gelir ama total null ise "0,00 TL" basılmaz ve buton devre dışıdır', async () => {
    mocked(ordersApi.getQuote).mockResolvedValue(
      quoteWithSummary({ productAmount: 1771.2, shippingAmount: 80, serviceFeeAmount: 239.18, total: null }),
    );

    renderWithProviders(<CheckoutScreen />);
    await goToStep3();

    // Sorgu hata vermedi (200), yalnız `total` boş. Tutar basılmıyor VE kullanıcıya
    // çıkış yolu veriliyor — "—" satırlarıyla sebepsiz kilitlenmiyor.
    await waitFor(() => expect(screen.getByTestId('order-summary-error')).toBeOnTheScreen());
    expect(screen.queryByText('0,00 TL')).toBeNull();
    expect(screen.getByText('Onayla ve Öde')).toBeOnTheScreen();
    expect(screen.queryByText(/Onayla ve Öde \(/)).toBeNull();

    await act(async () => {
      fireEvent.press(screen.getByText('Onayla ve Öde'));
    });
    expect(ordersApi.checkout).not.toHaveBeenCalled();
  });

  // `Number(undefined)` = NaN → `formatServerPrice` null kontrolünden geçiyor,
  // `formatPrice(NaN)` yine "0,00 TL" basıyordu.
  it('total alanı hiç yoksa (undefined/NaN) da "0,00 TL" basılmaz', async () => {
    mocked(ordersApi.getQuote).mockResolvedValue(
      quoteWithSummary({ productAmount: 1771.2, shippingAmount: 80, serviceFeeAmount: 239.18 }),
    );

    renderWithProviders(<CheckoutScreen />);
    await goToStep3();

    await waitFor(() => expect(screen.getByTestId('order-summary-error')).toBeOnTheScreen());
    expect(screen.queryByText('0,00 TL')).toBeNull();
    expect(screen.getByText('Onayla ve Öde')).toBeOnTheScreen();

    await act(async () => {
      fireEvent.press(screen.getByText('Onayla ve Öde'));
    });
    expect(ordersApi.checkout).not.toHaveBeenCalled();
  });

  it('gerçek 0 (ücretsiz kargo) yer tutucu DEĞİL "0,00 TL" basar', async () => {
    mocked(ordersApi.getQuote).mockResolvedValue(
      quoteWithSummary({ productAmount: 1771.2, shippingAmount: 0, serviceFeeAmount: 239.18, total: 2010.38 }),
    );

    renderWithProviders(<CheckoutScreen />);
    await waitFor(() => expect(screen.getByText('0,00 TL')).toBeOnTheScreen());
    expect(screen.getByText('2.010,38 TL')).toBeOnTheScreen();
  });
});

describe('N1 · adım 3 satır tutarı sunucudan gelir', () => {
  beforeEach(() => {
    mocked(ordersApi.checkout).mockReset();
    mocked(ordersApi.getQuote).mockReset();
    useCartStore.setState({ items: [CART_ITEM], lastUpdated: Date.now() });
  });

  afterEach(() => {
    useCartStore.setState({ items: [] });
  });

  it('satır items[].subtotal ile basılır — yerel price × quantity DEĞİL', async () => {
    // Sunucu: kampanya bitti, birim 885,60 → satır 1.771,20. Yerel çarpım
    // (619,92 × 2 = 1.239,84) ekranda HİÇ görünmemeli.
    mocked(ordersApi.getQuote).mockResolvedValue(
      quoteWithSummary(
        { productAmount: 1771.2, shippingAmount: 80, serviceFeeAmount: 239.18, total: 2090.38 },
        [{ productId: 'prod-1234567890', quantity: 2, unitPrice: 885.6, subtotal: 1771.2 }],
      ),
    );

    renderWithProviders(<CheckoutScreen />);
    await goToStep3();

    await waitFor(() =>
      expect(screen.getByTestId('order-item-subtotal')).toHaveTextContent('1.771,20 TL'),
    );
    // Donmuş yerel fiyatın hiçbir türevi ekranda yok.
    expect(screen.queryByText('1.239,84 TL')).toBeNull();
    expect(screen.queryByText('619,92 TL')).toBeNull();
  });

  it('sunucu satırı eşleşmezse yer tutucu basılır — yerel çarpıma DÜŞÜLMEZ', async () => {
    mocked(ordersApi.getQuote).mockResolvedValue(
      quoteWithSummary(
        { productAmount: 1771.2, shippingAmount: 80, serviceFeeAmount: 239.18, total: 2090.38 },
        [{ productId: 'baska-urun', quantity: 1, unitPrice: 10, subtotal: 10 }],
      ),
    );

    renderWithProviders(<CheckoutScreen />);
    await goToStep3();

    await waitFor(() => expect(screen.getByTestId('order-item-subtotal')).toHaveTextContent('—'));
    expect(screen.queryByText('1.239,84 TL')).toBeNull();
  });
});
