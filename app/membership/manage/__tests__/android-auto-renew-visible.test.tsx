/**
 * Task 10 GAP 1 eşi · Android/web davranışı DEĞİŞMEMELİ — otomatik yenileme
 * switch'i orada duruyor. iOS tarafı: ios-auto-renew-hidden.test.tsx.
 */
import React from 'react';
import { screen } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { resetRouterMocks } from '@/test-utils/router-mock';

jest.mock('@/lib/purchases', () => ({
  ...jest.requireActual('@/lib/purchases'),
  CAN_BUY_DIGITAL: true,
}));

jest.mock('expo-router', () => require('@/test-utils/router-mock').routerMock);

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

let mockAuthState: any = { isAuthenticated: true, user: {} };
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (state: any) => unknown) => {
    const state: any = mockAuthState;
    return sel ? sel(state) : state;
  },
}));

jest.mock('@/lib/api', () => ({
  membershipApi: {
    getCurrentMembership: jest.fn(),
    cancel: jest.fn().mockResolvedValue({ data: {} }),
    setAutoRenew: jest.fn().mockResolvedValue({ data: {} }),
  },
}));

import { membershipApi } from '@/lib/api';
import MembershipManageScreen from '../index';

const mockGetMembership = membershipApi.getCurrentMembership as jest.Mock;

const paidActiveMembership = {
  tier: { type: 'premium', name: 'Premium' },
  status: 'active',
  autoRenew: true,
  currentPeriodStart: new Date(Date.now() - 86400000).toISOString(),
  currentPeriodEnd: new Date(Date.now() + 10 * 86400000).toISOString(),
};

describe('Android · üyelik yönetimi ekranında otomatik yenileme switch\'i var', () => {
  beforeEach(() => {
    resetRouterMocks();
    mockAuthState = { isAuthenticated: true, user: {} };
    mockGetMembership.mockReset().mockResolvedValue({ data: paidActiveMembership });
  });

  it('otomatik yenileme başlığı render edilir', async () => {
    renderWithProviders(<MembershipManageScreen />);
    expect(await screen.findByText('membership.autoRenew')).toBeOnTheScreen();
  });
});
