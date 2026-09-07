/**
 * Task 10 GAP 2 · iOS'ta "membership.manageMembershipHint" satırı
 * ("Üyelik Yönetimi (otomatik yenileme & kayıtlı kartlar)") gizli olmalı —
 * FREE kullanıcıya bile tam olarak kapattığımız non-Apple yinelenen tahsilat
 * yönetimini tanıtıyor. İptal akışı buradan değil Profil → Abonelik
 * (SubscriptionBody) üzerinden gelir ve orada iOS'ta da açık kalır (bkz.
 * app/settings/subscription/__tests__/ios-reactivate-gate.test.tsx).
 *
 * TEKNİK: bkz. ios-membership-screen.test.tsx başlığındaki not — CAN_BUY_DIGITAL
 * modül seviyesinde mock'lanmalı.
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

let mockAuthState: any = { isAuthenticated: true, user: {} };
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (state: any) => unknown) => {
    const state: any = mockAuthState;
    return sel ? sel(state) : state;
  },
}));

jest.mock('@/lib/api', () => ({
  api: { get: jest.fn() },
  membershipApi: { getCurrentMembership: jest.fn(), getTiers: jest.fn() },
}));
import { membershipApi } from '@/lib/api';
import MembershipScreen from '../index';

const mockGetMembership = membershipApi.getCurrentMembership as jest.Mock;
const mockGetTiers = membershipApi.getTiers as jest.Mock;

describe('iOS · üyelik ekranında yönetim (otomatik yenileme) satırı yok', () => {
  beforeEach(() => {
    resetRouterMocks();
    mockAuthState = { isAuthenticated: true, user: {} };
    mockGetTiers.mockResolvedValue({ data: [] });
  });

  it('FREE kullanıcıda dahi görünmez', async () => {
    mockGetMembership.mockResolvedValue({
      data: { tier: { type: 'free', name: 'Ücretsiz' } },
    });
    renderWithProviders(<MembershipScreen />);
    expect(await screen.findByText('membership.currentPlan')).toBeOnTheScreen();
    expect(screen.queryByText('membership.manageMembershipHint')).toBeNull();
  });

  it('PREMIUM kullanıcıda da görünmez', async () => {
    mockGetMembership.mockResolvedValue({
      data: { tier: { type: 'premium', name: 'Premium' } },
    });
    renderWithProviders(<MembershipScreen />);
    expect(await screen.findByText('membership.currentPlan')).toBeOnTheScreen();
    expect(screen.queryByText('membership.manageMembershipHint')).toBeNull();
  });
});
