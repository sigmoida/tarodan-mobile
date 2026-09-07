/**
 * Task 10 GAP 1 · iOS'ta otomatik yenileme switch'i tamamen gizli olmalı.
 *
 * Otomatik yenilemeyi yeniden AÇMAK PayTR'de yinelenen tahsilatı yeniden
 * başlatmak demek — yani uygulama içi satın alma. Yarım gated bir switch
 * (görünür ama devre dışı) yanıltıcı olurdu; bu yüzden kart bütünüyle
 * kapanır. İPTAL düğmesi satın alma OLMADIĞI için iOS'ta da kalmalı.
 *
 * TEKNİK: CAN_BUY_DIGITAL modül-yükleme-anındaki bir sabit ve ekran bu
 * dosyanın en üstünde statik import edildiği için `Platform.OS` gövde
 * içinde atansa da geç kalır. `@/lib/purchases`ı modül seviyesinde
 * mock'luyoruz — babel-plugin-jest-hoist bunu import'ların üstüne taşır.
 * (bkz. app/membership/__tests__/ios-membership-screen.test.tsx)
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

describe('iOS · üyelik yönetimi ekranında otomatik yenileme switch\'i yok', () => {
  beforeEach(() => {
    resetRouterMocks();
    mockAuthState = { isAuthenticated: true, user: {} };
    mockGetMembership.mockReset().mockResolvedValue({ data: paidActiveMembership });
  });

  it('otomatik yenileme başlığı ve yardımcı metni render edilmez', async () => {
    renderWithProviders(<MembershipManageScreen />);
    expect(await screen.findByText('membership.manageMembership')).toBeOnTheScreen();
    expect(screen.queryByText('membership.autoRenew')).toBeNull();
    expect(screen.queryByText('membership.manageAutoRenewOnHelper')).toBeNull();
    expect(screen.queryByText('membership.manageAutoRenewOffHelper')).toBeNull();
  });

  it('iptal düğmesi hâlâ görünür — satın alma değil', async () => {
    renderWithProviders(<MembershipManageScreen />);
    expect(await screen.findByText('membership.cancelMembership')).toBeOnTheScreen();
  });
});
