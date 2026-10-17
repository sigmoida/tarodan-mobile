/**
 * Kayıtlı Kartlarım — iki mağazanın kartları birlikte listelenir (amaçsız istek,
 * web gibi). Rozetler web `SavedCardCard` ile aynı: amaç rozeti yok; uygun kartta
 * "Oto-yenilemeye uygun", değilse "CVV gerektirir".
 */
import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { QueryClient } from '@tanstack/react-query';
import { renderWithProviders } from '@/test-utils';
import { qk } from '@/lib/query';
import { appAlert } from '@/ui';

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
    deleteCard: jest.fn(async () => ({ data: {} })),
  },
}));
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (state: any) => unknown) => {
    const state: any = { isAuthenticated: true };
    return sel ? sel(state) : state;
  },
}));

import { membershipApi } from '@/lib/api';
import PaymentMethodsScreen from '../index';

it('kartlar amaçsız istenir; rozetler web ile aynı (amaç rozeti yok)', async () => {
  renderWithProviders(<PaymentMethodsScreen />);
  await waitFor(() => expect(screen.getByText(/1111/)).toBeOnTheScreen());
  expect(membershipApi.listCards).toHaveBeenCalledWith();

  expect(screen.queryAllByTestId('card-badge-purpose')).toHaveLength(0);
  expect(screen.queryByText('Sepet')).toBeNull();

  // Web kuralı: `autoRenewEligible` değilse "CVV gerektirir" (sepet kartı CVV istemese de).
  expect(screen.getAllByTestId('card-badge-cvv')).toHaveLength(1);
  expect(screen.getByTestId('card-badge-cvv')).toHaveTextContent('CVV gerektirir');
  expect(screen.getAllByTestId('card-badge-autoRenew')).toHaveLength(1);
  expect(screen.getByTestId('card-badge-autoRenew')).toHaveTextContent('Oto-yenilemeye uygun');
});

it('kart silinince ödeme formunun amaçlı listesi de (`qk.payments.savedCards(amaç)`) tazelenir', async () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  queryClient.setQueryData(qk.payments.savedCards('checkout'), [{ id: 'c-shop' }]);
  renderWithProviders(<PaymentMethodsScreen />, { queryClient });
  await waitFor(() => expect(screen.getByText(/1111/)).toBeOnTheScreen());

  fireEvent.press(screen.getByTestId('card-delete-c-shop'));
  const buttons = (appAlert as jest.Mock).mock.calls[0][2] as { style?: string; onPress?: () => Promise<void> }[];
  await buttons.find((b) => b.style === 'destructive')!.onPress!();

  expect(membershipApi.deleteCard).toHaveBeenCalledWith('c-shop');
  expect(queryClient.getQueryState(qk.payments.savedCards('checkout'))?.isInvalidated).toBe(true);
});
