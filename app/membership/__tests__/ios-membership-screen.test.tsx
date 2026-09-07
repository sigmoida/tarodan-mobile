/**
 * iOS'ta üyelik ekranı yalnız kullanıcının KENDİ paketini gösterir.
 * Fiyat, aylık/yıllık geçişi, diğer paket kartları ve bekleyen ödeme bandı
 * (ödemeyi tamamlamaya çağırıyor) görünmez.
 *
 * TEKNİK: CAN_BUY_DIGITAL modül-yükleme-anındaki bir sabit ve ekran bu
 * dosyanın en üstünde statik import edildiği için `Platform.OS` gövde
 * içinde atansa da geç kalır. `@/lib/purchases`ı modül seviyesinde
 * mock'luyoruz — babel-plugin-jest-hoist bunu import'ların üstüne taşır.
 * (bkz. app/(tabs)/__tests__/messages.test.tsx, app/settings/__tests__/subscription.test.tsx)
 */
import React from 'react';
import { screen, waitFor } from '@testing-library/react-native';
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
const mockGetMembership = membershipApi.getCurrentMembership as jest.Mock;
const mockGetTiers = membershipApi.getTiers as jest.Mock;

import MembershipScreen from '../index';

describe('iOS · üyelik ekranı yalnız mevcut paket', () => {
  beforeEach(() => {
    resetRouterMocks();
    mockAuthState = { isAuthenticated: true, user: {} };
    mockGetMembership.mockResolvedValue({
      data: {
        tier: { type: 'free', name: 'Ücretsiz' },
        pendingPayment: { id: 'pay1', tierType: 'premium', tierName: 'Premium' },
      },
    });
    mockGetTiers.mockResolvedValue({ data: [] });
  });

  it('iOS: fiyat tablosu ve dönem geçişi yok, mevcut paket var', async () => {
    renderWithProviders(<MembershipScreen />);
    expect(await screen.findByText('membership.currentPlan')).toBeTruthy();
    expect(screen.queryByText('membership.monthly')).toBeNull();
    expect(screen.queryByText('membership.yearly')).toBeNull();
    expect(screen.queryByText('membership.mostPopular')).toBeNull();
  });

  it('iOS: bekleyen ödeme bandı görünmez (satın almaya çağırıyor)', async () => {
    renderWithProviders(<MembershipScreen />);
    await screen.findByText('membership.currentPlan');
    expect(screen.queryByText('membership.pendingPaymentSubtitle')).toBeNull();
  });
});
