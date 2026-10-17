/**
 * Üyelik Planları — satın alma AÇIK platform (CAN_BUY_DIGITAL=true): kartlar fiyatı gösterir
 * (mevcut ekranla aynı getPrice), yine de satın alma düğmesi yok; "uygulamada değiştirilemez"
 * notu gösterilmez (o platformda doğru değil).
 */
import React from 'react';
import { screen } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { resetRouterMocks } from '@/test-utils/router-mock';
import { formatPrice } from '@/utils/format';

jest.mock('@/lib/purchases', () => ({
  ...jest.requireActual('@/lib/purchases'),
  CAN_BUY_DIGITAL: true,
}));
jest.mock('expo-router', () => require('@/test-utils/router-mock').routerMock);
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (s: any) => unknown) => {
    const state: any = { isAuthenticated: true, user: { id: 'u1' } };
    return sel ? sel(state) : state;
  },
}));
jest.mock('@/lib/api', () => ({
  api: { get: jest.fn() },
  membershipApi: {
    getCurrentMembership: jest.fn(() =>
      Promise.resolve({ data: { tier: { type: 'free', name: 'Free' } } }),
    ),
    getTiers: jest.fn(() =>
      Promise.resolve({ data: [{ type: 'premium', monthlyPrice: 99.99, yearlyPrice: 959.9 }] }),
    ),
  },
}));

import MembershipPlansScreen from '../index';

beforeEach(() => resetRouterMocks());

it('fiyatlar görünür, mevcut plan ücretsiz kartta; not ve satın alma düğmesi yok', async () => {
  renderWithProviders(<MembershipPlansScreen />);
  expect(await screen.findByText(formatPrice(99.99))).toBeTruthy();
  expect(screen.getByTestId('membership-plan-price-free')).toBeTruthy();
  expect(screen.getAllByTestId('membership-plan-current-badge')).toHaveLength(1);
  expect(screen.queryByTestId('membership-plans-note')).toBeNull();
  expect(screen.queryByText('common.continue')).toBeNull();
});
