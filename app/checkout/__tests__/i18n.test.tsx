/**
 * Checkout ekranı i18n.
 *
 * Ödeme akışı bu turun en riskli ekranı: mantık Plan 4'te AYNEN taşınmıştı,
 * bu tur yalnız METİN kaynağını değiştiriyor — hiçbir dallanma, tutar ya da
 * payload dokunulmuyor. Test `t`'yi anahtarı döndürecek şekilde mock'layıp
 * ekranın katalogdan okuduğunu doğruluyor.
 *
 * Ayrıca React DIŞI iki modül var (`_lib/validation`, `_hooks/useCheckout`):
 * onlar hook çağıramadığı için global i18next örneğini kullanıyor; doğrulama
 * mesajı testi bunu ayrıca kilitliyor.
 */
import React from 'react';
import { screen } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';

jest.mock('expo-router', () => ({
  ...require('@/test-utils/router-mock').routerMock,
  useFocusEffect: jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

const mockCheckout = {
  items: [],
  step: 1,
  loading: false,
  quoteLoading: false,
  quoteError: false,
  total: null,
};
jest.mock('../_hooks/useCheckout', () => ({ useCheckout: () => mockCheckout }));

import CheckoutScreen from '../index';
import { validateGuest } from '../_lib/validation';

describe('checkout screen i18n', () => {
  it('takes the empty-cart state from the catalogue', () => {
    renderWithProviders(<CheckoutScreen />);

    expect(screen.getByText('checkout.emptyCart')).toBeTruthy();
    expect(screen.getByText('checkout.emptyCartDesc')).toBeTruthy();
  });

  it('leaves no hardcoded Turkish in the empty-cart state', () => {
    renderWithProviders(<CheckoutScreen />);

    expect(screen.queryByText(/Sepetiniz Boş/)).toBeNull();
    expect(screen.queryByText(/ürün ekleyin/)).toBeNull();
  });
});

describe('checkout guest validation messages', () => {
  // Bu modül React dışı — global i18next örneğini kullanıyor, jest.setup'ta
  // gerçek katalogla (tr) kurulu, o yüzden burada Türkçe metin bekleniyor.
  it('translates the missing-name message through the catalogue', () => {
    expect(validateGuest('', 'a@b.com', '5321234567')).toBe('Lütfen adınızı girin');
  });

  it('translates the invalid-email message through the catalogue', () => {
    expect(validateGuest('A', 'nope', '5321234567')).toBe('Geçerli bir e-posta adresi girin');
  });
});
