/**
 * checkout-layout · üye ve "Hemen Al" görünümleri — web CheckoutClient'ın TEK sayfa düzeni.
 *
 * Kilitlenen: kayıtlı adres kartları + "Yeni Adres Ekle" kartı, fatura adresi iki seçenek
 * (aynı / farklı), "Hemen Al" uyarısı, özet satırı etiketleri ve "Ödeme Yap" sabit alt barı.
 * Ödeme mantığı (payload, kapılar) kendi dosyalarında; burada yalnız sunum.
 */
import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const mockParams: { buyNow?: string } = {};
jest.mock('expo-router', () => {
  const base = require('@/test-utils/router-mock').routerMock;
  return { ...base, useLocalSearchParams: () => mockParams };
});

const ADDRESSES = [
  {
    id: 'addr-1',
    title: 'Ev',
    fullName: 'Ali Veli',
    phone: '+905321234567',
    city: 'İstanbul',
    district: 'Kadıköy',
    address: 'Test Sokak No:1',
    isDefault: true,
  },
  {
    id: 'addr-2',
    title: 'İş',
    fullName: 'Ayşe Kaya',
    phone: '+905331234567',
    city: 'Ankara',
    district: 'Çankaya',
    address: 'Ofis Cd. No:2',
  },
];

jest.mock('@/lib/api', () => ({
  toExpectedPricing: jest.requireActual('@/lib/api').toExpectedPricing,
  ordersApi: {
    getQuote: jest.fn(() =>
      Promise.resolve({
        data: {
          pricingHash: 'h1',
          shippingTariffVersion: 3,
          pricing: { summary: { productAmount: 100, shippingAmount: 50, serviceFeeAmount: 15, total: 165 } },
        },
      }),
    ),
  },
  paymentsApi: {},
  addressesApi: { getAll: jest.fn(() => Promise.resolve({ data: ADDRESSES })) },
  discountsApi: { validate: jest.fn() },
}));

jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (state: any) => unknown) => {
    const state: any = { isAuthenticated: true, user: { id: 'u1', email: 'member@example.com' } };
    return sel ? sel(state) : state;
  },
}));

import { useCartStore } from '@/stores/cartStore';
import CheckoutScreen from '../index';

const ITEM = {
  id: 'cart-1',
  productId: 'prod-1234567890',
  title: 'Test Model Araba',
  price: 100,
  quantity: 2,
  imageUrl: 'https://x/y.jpg',
  brand: 'Bburago',
  scale: '1:18',
  seller: { id: 's1', displayName: 'Satıcı Mağaza' },
  addedAt: Date.now(),
};

beforeEach(() => {
  delete mockParams.buyNow;
  useCartStore.setState({ items: [ITEM], deselectedIds: [], buyNowItem: null, lastUpdated: Date.now() } as any);
});
afterEach(() => {
  useCartStore.setState({ items: [], buyNowItem: null } as any);
});

describe('üye — tek sayfa düzeni', () => {
  it('ürün kartı satıcıyı ve adedi yazar; kayıtlı adresler kart olarak listelenir', async () => {
    renderWithProviders(<CheckoutScreen />);
    expect(screen.getByText('Satıcı: Satıcı Mağaza')).toBeOnTheScreen();
    expect(screen.getByText('Adet: 2')).toBeOnTheScreen();
    await waitFor(() => expect(screen.getByText('Ev')).toBeOnTheScreen());
    expect(screen.getByText('İş')).toBeOnTheScreen();
    expect(screen.getByText('Yeni Adres Ekle')).toBeOnTheScreen();
    // Varsayılan adres seçili gelir → satır içi adres formu kapalı.
    expect(screen.queryByTestId('shipping-fullname-input')).toBeNull();
  });

  it('"Yeni Adres Ekle" kartı satır içi formu açar', async () => {
    renderWithProviders(<CheckoutScreen />);
    await waitFor(() => expect(screen.getByText('Yeni Adres Ekle')).toBeOnTheScreen());
    fireEvent.press(screen.getByText('Yeni Adres Ekle'));
    expect(await screen.findByTestId('shipping-fullname-input')).toBeOnTheScreen();
  });

  it('fatura adresi: "aynı" seçili gelir; "farklı" seçilince ikinci adres seçici açılır', async () => {
    renderWithProviders(<CheckoutScreen />);
    expect(screen.getByText('Fatura Adresi')).toBeOnTheScreen();
    expect(screen.getByText('Fatura adresi teslimat adresiyle aynı')).toBeOnTheScreen();
    expect(screen.queryByText('Fatura adresini girin')).toBeNull();

    fireEvent.press(screen.getByText('Farklı fatura adresi kullan'));
    expect(await screen.findByText('Fatura adresini girin')).toBeOnTheScreen();
  });

  it('özet kartı kupon + web etiketleri + sözleşme taşır; ödeme yöntemi kartı yok', async () => {
    renderWithProviders(<CheckoutScreen />);
    await waitFor(() => expect(screen.getByText('165,00 TL')).toBeOnTheScreen());
    expect(screen.getByTestId('coupon-input')).toBeOnTheScreen();
    expect(screen.getByText('Ürün ücreti')).toBeOnTheScreen();
    expect(screen.getByText('Kargo ücreti')).toBeOnTheScreen();
    expect(screen.getByText('Hizmet Bedeli')).toBeOnTheScreen();
    expect(screen.getByTestId('checkout-distance-sales-checkbox')).toBeOnTheScreen();
    expect(screen.queryByTestId('checkout-payment')).toBeNull();
    // Kart alanı yok: kart bilgisi uygulamada girilmez.
    expect(screen.queryByText('Kart Bilgileri')).toBeNull();
  });
});

describe('"Hemen Al"', () => {
  it('yalnız tek ürün ödenir uyarısı çıkar', () => {
    mockParams.buyNow = '1';
    useCartStore.setState({ buyNowItem: { ...ITEM, quantity: 1 } } as any);
    renderWithProviders(<CheckoutScreen />);
    expect(screen.getByText(/Yalnız seçtiğiniz ürün ödenecek/)).toBeOnTheScreen();
  });

  it('sepet yolunda uyarı yok', () => {
    renderWithProviders(<CheckoutScreen />);
    expect(screen.queryByText(/Yalnız seçtiğiniz ürün ödenecek/)).toBeNull();
  });
});
