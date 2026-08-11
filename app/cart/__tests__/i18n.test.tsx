/**
 * Sepet ekranı i18n — çekirdek ticaret ekranlarında gömülü Türkçe kalmamalı.
 *
 * Katalog hazır (~4.800 anahtar) ama sepet/checkout/sipariş/ürün ekranları
 * `useTranslation`'ı hiç çağırmıyordu. Test `t`'yi anahtarı aynen döndürecek
 * şekilde mock'luyor: ekranda anahtar görünüyorsa metin katalogdan geliyor
 * demektir, sabit Türkçe kalmışsa görünmez.
 */
import React from 'react';
import { screen } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';

jest.mock('expo-router', () => require('@/test-utils/router-mock').routerMock);

// AsyncStorage native modülü testte yok; cartStore persist middleware'i kullanıyor.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

const mockCart = {
  items: [] as unknown[],
  itemCount: 0,
  total: null,
  productAmount: null,
  shippingAmount: null,
  serviceFeeAmount: null,
  quoteError: false,
  quoteLoading: false,
  retryQuote: jest.fn(),
  unitPriceFor: () => 10,
  stockWarningFor: () => null,
  isAuthenticated: true,
  updateQuantity: jest.fn(),
  removeItem: jest.fn(),
  // Satır seçimi (P2 #10) — ekran her satır için okur.
  selectedItems: [] as unknown[],
  selectedCount: 0,
  allSelected: true,
  isSelected: () => true,
  toggleSelected: jest.fn(),
  toggleSelectAll: jest.fn(),
};
jest.mock('../_hooks/useCart', () => ({ useCart: () => mockCart }));

import CartScreen from '../index';

describe('cart screen i18n', () => {
  it('takes the empty state from the catalogue', () => {
    renderWithProviders(<CartScreen />);

    expect(screen.getByText('cart.empty')).toBeTruthy();
    expect(screen.getByText('cart.emptyDesc')).toBeTruthy();
    expect(screen.getByText('cart.browseListings')).toBeTruthy();
  });

  it('leaves no hardcoded Turkish in the empty state', () => {
    renderWithProviders(<CartScreen />);

    expect(screen.queryByText(/Sepetiniz Boş/)).toBeNull();
    expect(screen.queryByText(/İlanlara Göz At/)).toBeNull();
  });

  it('takes the filled cart chrome from the catalogue', () => {
    mockCart.items = [
      {
        id: 'i1',
        productId: 'p1',
        title: 'X',
        price: 10,
        quantity: 1,
        seller: { id: 's1', displayName: 'S' },
      },
    ];
    mockCart.itemCount = 1;

    renderWithProviders(<CartScreen />);

    expect(screen.getByText('cart.expiryNotice')).toBeTruthy();
    expect(screen.getByText('common.total')).toBeTruthy();
    expect(screen.getByText('cart.proceedToCheckout')).toBeTruthy();

    mockCart.items = [];
    mockCart.itemCount = 0;
  });
});
