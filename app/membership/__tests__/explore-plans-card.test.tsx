/**
 * Üyelik ekranı — "Planları Keşfet" kartı satın alma kapalıyken de görünür (fiyat içermez) ve
 * tüm kart dokunulunca /membership/plans'a gider.
 */
import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { pushMock, resetRouterMocks } from '@/test-utils/router-mock';

jest.mock('@/lib/purchases', () => ({
  ...jest.requireActual('@/lib/purchases'),
  CAN_BUY_DIGITAL: false,
}));
jest.mock('expo-router', () => require('@/test-utils/router-mock').routerMock);
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (s: any) => unknown) => {
    const state: any = { isAuthenticated: true, user: {} };
    return sel ? sel(state) : state;
  },
}));
jest.mock('@/lib/api', () => ({
  api: { get: jest.fn() },
  membershipApi: {
    getCurrentMembership: jest.fn(() =>
      Promise.resolve({ data: { tier: { type: 'premium', name: 'Premium' } } }),
    ),
    getTiers: jest.fn(() => Promise.resolve({ data: [] })),
  },
}));

import MembershipScreen from '../index';

beforeEach(() => resetRouterMocks());

it('"Planları Keşfet" kartı başlık + açıklama taşır ve plan ekranına gider', async () => {
  renderWithProviders(<MembershipScreen />);
  const card = await screen.findByTestId('membership-explore-plans');
  expect(screen.getByText('membership.explorePlansTitle')).toBeTruthy();
  expect(screen.getByText('membership.explorePlansDesc')).toBeTruthy();
  fireEvent.press(card);
  expect(pushMock).toHaveBeenCalledWith('/membership/plans');
});
