/**
 * Kayıtlı Kartlarım — iki mağazanın kartları birlikte listelenir (amaçsız istek,
 * web gibi). Rozetler web `SavedCardCard` ile aynı: amaç rozeti yok; uygun kartta
 * "Oto-yenilemeye uygun", değilse "CVV gerektirir".
 */
import React from 'react';
import { screen, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';

jest.mock('@/lib/purchases', () => ({ CAN_BUY_DIGITAL: true }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false) },
}));
jest.mock('@/lib/api', () => ({
  membershipApi: {
    listCards: jest.fn(async () => ({
      data: [
        {
          id: 'c-shop', last4: '1111', brand: 'Visa', bank: null, cardType: null, cardScheme: null,
          businessCard: false, expMonth: '12', expYear: '30', requireCvv: false, isDefault: true,
          autoRenewEligible: false, purpose: 'checkout',
        },
        {
          id: 'c-mem', last4: '2222', brand: 'Mastercard', bank: null, cardType: null, cardScheme: null,
          businessCard: false, expMonth: '11', expYear: '29', requireCvv: false, isDefault: false,
          autoRenewEligible: true, purpose: 'membership',
        },
      ],
    })),
    deleteCard: jest.fn(),
  },
}));
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (state: any) => unknown) => {
    const state: any = { isAuthenticated: true };
    return sel ? sel(state) : state;
  },
}));

import { membershipApi } from '@/lib/api';
import PaymentMethodsScreen from '../../payment-methods';

it('kartlar amaçsız istenir; rozetler web ile aynı (amaç rozeti yok)', async () => {
  renderWithProviders(<PaymentMethodsScreen />);
  await waitFor(() => expect(screen.getByText(/1111/)).toBeOnTheScreen());
  expect(membershipApi.listCards).toHaveBeenCalledWith();

  expect(screen.queryAllByTestId('card-badge-purpose')).toHaveLength(0);
  expect(screen.queryByText('Sepet')).toBeNull();

  // Web kuralı: `autoRenewEligible` değilse "CVV gerektirir" (sepet kartı CVV istemese de).
  expect(screen.getAllByTestId('card-badge-cvv')).toHaveLength(1);
  expect(screen.getByTestId('card-badge-cvv').props.children).toBe('CVV gerektirir');
  expect(screen.getAllByTestId('card-badge-autoRenew')).toHaveLength(1);
  expect(screen.getByTestId('card-badge-autoRenew').props.children).toBe('Oto-yenilemeye uygun');
});
