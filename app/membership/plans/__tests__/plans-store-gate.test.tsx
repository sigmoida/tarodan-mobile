/**
 * Üyelik Planları (salt görüntüleme) — satın alma KAPALI platform (iOS/Android, CAN_BUY_DIGITAL=false):
 *  - görünür her plan bir kart, özellik listesiyle; mevcut plan "Mevcut Planınız" rozetli
 *  - fiyat YOK (App Store 3.1.1), satın alma / devam düğmesi YOK
 *  - en altta "uygulamada plan değişikliği yok" notu; web/harici satın alma bağlantısı yok
 */
import React from 'react';
import { screen } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { resetRouterMocks } from '@/test-utils/router-mock';

jest.mock('@/lib/purchases', () => ({
  ...jest.requireActual('@/lib/purchases'),
  CAN_BUY_DIGITAL: false,
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
      Promise.resolve({ data: { tier: { type: 'premium', name: 'Premium' } } }),
    ),
    getTiers: jest.fn(() =>
      Promise.resolve({ data: [{ type: 'premium', monthlyPrice: 99.99, yearlyPrice: 959.9 }] }),
    ),
  },
}));

import MembershipPlansScreen from '../index';

beforeEach(() => resetRouterMocks());

it('bireysel hesapta free/basic/premium kartları; mevcut plan rozeti yalnız premium kartında', async () => {
  renderWithProviders(<MembershipPlansScreen />);
  const premium = await screen.findByTestId('membership-plan-premium');
  expect(screen.getByTestId('membership-plan-free')).toBeTruthy();
  expect(screen.getByTestId('membership-plan-basic')).toBeTruthy();
  expect(screen.queryByTestId('membership-plan-business')).toBeNull();
  expect(screen.getAllByTestId('membership-plan-current-badge')).toHaveLength(1);
  expect(JSON.stringify(premium.props.style)).toContain('"borderWidth":2');
  // Özellik listesi (web anahtarları)
  expect(screen.getByText('membership.featureTrade')).toBeTruthy();
  expect(screen.getByText('membership.tierLimitBasicSearch')).toBeTruthy();
});

it('fiyat yok, satın alma düğmesi yok; alt not var', async () => {
  renderWithProviders(<MembershipPlansScreen />);
  await screen.findByTestId('membership-plan-premium');
  expect(screen.queryByTestId('membership-plan-price-premium')).toBeNull();
  expect(screen.queryByText(/TL/)).toBeNull();
  expect(screen.queryByText('membership.perMonth')).toBeNull();
  expect(screen.queryByText('common.continue')).toBeNull();
  expect(screen.getByTestId('membership-plans-note').props.children).toBe('membership.plansInAppNote');
});
