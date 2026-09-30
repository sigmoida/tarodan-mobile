/**
 * Apple 2.1(b) "references to subscriptions": iOS'ta abonelik satılmıyor ama
 * Kayıtlı Kartlarım "otomatik yenileme" diyor ve kartlara "Oto-yenilemeye uygun"
 * rozeti basıyordu. iOS'ta metin nötr, rozet yok.
 */
import React from 'react';
import { screen, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';

jest.mock('@/lib/purchases', () => ({ CAN_BUY_DIGITAL: false }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false) },
}));
jest.mock('@/lib/api', () => ({
  membershipApi: {
    listCards: jest.fn(async () => ({
      data: [
        {
          id: 'c1', last4: '4242', brand: 'Visa', bank: null, cardType: 'credit', cardScheme: null,
          businessCard: false, expMonth: '12', expYear: '30', requireCvv: false, isDefault: true,
          autoRenewEligible: true,
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

import PaymentMethodsScreen from '../payment-methods';

it('iOS: otomatik yenileme ifadesi ve rozeti yok', async () => {
  renderWithProviders(<PaymentMethodsScreen />);
  await waitFor(() => expect(screen.getByText(/4242/)).toBeTruthy());
  expect(screen.queryByText(/yenile/i)).toBeNull();
  expect(screen.queryByText(/renew/i)).toBeNull();
});
