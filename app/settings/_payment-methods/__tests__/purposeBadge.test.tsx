/**
 * Kayıtlı Kartlarım — iki mağazanın kartları birlikte listelenir (amaçsız istek),
 * her kartta mağaza rozeti ("Sepet" / "Üyelik") görünür (API delta 20 P2).
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

it('kartlar amaçsız istenir ve her kartta mağaza rozeti var', async () => {
  renderWithProviders(<PaymentMethodsScreen />);
  await waitFor(() => expect(screen.getByText(/1111/)).toBeOnTheScreen());
  expect(membershipApi.listCards).toHaveBeenCalledWith();

  const purposes = screen.getAllByTestId('card-badge-purpose').map((n) => n.props.children);
  expect(purposes).toEqual(['Sepet', 'Üyelik']);

  // CVV istemeyen sepet kartında "CVV gerektirir" yok; üyelik kartı oto-yenilemeye uygun.
  expect(screen.queryByText('CVV gerektirir')).toBeNull();
  expect(screen.getAllByTestId('card-badge-autoRenew')).toHaveLength(1);
  expect(screen.getByTestId('card-badge-autoRenew').props.children).toBe('Oto-yenilemeye uygun');
});
