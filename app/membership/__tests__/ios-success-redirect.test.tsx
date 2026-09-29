/**
 * iOS'ta üyelik satılmıyor (Apple 3.1.1): derin bağlantıyla açılan başarı
 * ekranı kademe tanıtımı göstermez, /membership'e yönlendirir.
 */
import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('@/lib/purchases', () => ({ CAN_BUY_DIGITAL: false }));
const mockRedirect = jest.fn((_p: { href: string }) => null);
jest.mock('expo-router', () => ({
  Redirect: (p: { href: string }) => mockRedirect(p),
  router: { replace: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => ({ tier: 'premium' }),
}));
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (s: any) => unknown) => {
    const state: any = { refreshUserData: jest.fn() };
    return sel ? sel(state) : state;
  },
}));
jest.mock('@/lib/api', () => ({ paymentsApi: {} }));

import MembershipSuccessScreen from '../success';

it('iOS: /membership`e yönlendirir', () => {
  render(<MembershipSuccessScreen />);
  expect(mockRedirect).toHaveBeenCalledWith(expect.objectContaining({ href: '/membership' }));
});
