/**
 * Task 10 GAP 2 eşi · Android/web davranışı DEĞİŞMEMELİ — "Üyelik Yönetimi"
 * satırı orada duruyor. iOS tarafı: ios-manage-hint-hidden.test.tsx.
 */
import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { resetRouterMocks, pushMock } from '@/test-utils/router-mock';

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
  api: { get: jest.fn() },
  membershipApi: { getCurrentMembership: jest.fn(), getTiers: jest.fn() },
}));
import { membershipApi } from '@/lib/api';
import MembershipScreen from '../index';

const mockGetMembership = membershipApi.getCurrentMembership as jest.Mock;
const mockGetTiers = membershipApi.getTiers as jest.Mock;

describe('Android · üyelik ekranında yönetim satırı var ve /membership/manage\'e gider', () => {
  beforeEach(() => {
    resetRouterMocks();
    mockAuthState = { isAuthenticated: true, user: {} };
    mockGetTiers.mockResolvedValue({ data: [] });
    mockGetMembership.mockResolvedValue({
      data: { tier: { type: 'free', name: 'Ücretsiz' } },
    });
  });

  it('satır render edilir ve basılınca yönlendirir', async () => {
    renderWithProviders(<MembershipScreen />);
    const row = await screen.findByText('membership.manageMembershipHint');
    expect(row).toBeOnTheScreen();
    fireEvent.press(row);
    expect(pushMock).toHaveBeenCalledWith('/membership/manage');
  });
});
