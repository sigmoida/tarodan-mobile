/**
 * J14 · Üyelik başarı ekranı (membership/success).
 * Bulgu #14 regresyonu: ekran daima "Premium" yazıyordu; `?tier=` paramı yok
 * sayılıyordu. Burada içerik kademeye göre uyarlanıyor mu doğrulanır.
 */
import React from 'react';
import { screen, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { resetRouterMocks } from '@/test-utils/router-mock';

let mockParams: Record<string, string | undefined> = {};
jest.mock('expo-router', () => ({
  ...require('@/test-utils/router-mock').routerMock,
  useLocalSearchParams: () => mockParams,
}));

const mockRefreshUserData = jest.fn().mockResolvedValue(undefined);
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (state: any) => unknown) => {
    const state: any = ({ refreshUserData: mockRefreshUserData });
    return sel ? sel(state) : state;
  },
}));

jest.mock('@/lib/api', () => ({
  paymentsApi: { verify: jest.fn().mockResolvedValue({ data: { completed: true } }) },
}));

import MembershipSuccessScreen from '../success';

describe('J14 · üyelik başarı ekranı (membership/success)', () => {
  beforeEach(() => {
    resetRouterMocks();
    mockRefreshUserData.mockClear();
    mockParams = {};
  });

  it('J14.S1 tier=business → "İş" gösterir, "Premium" yazmaz', async () => {
    // Not: ekran katalogtaki `membership.business` ("İş") kullanır — checkout
    // (`checkout/_lib/tiers.ts`) ile parite. Bu ekran daha önce hardcoded
    // "Business" gösteriyordu; katalog/checkout ile aynı hizaya getirildi
    // (i18n göçü, bkz. docs/i18n-uyelik-report.md).
    mockParams = { tier: 'business', paymentId: 'pay1' };
    renderWithProviders(<MembershipSuccessScreen />);
    await waitFor(() =>
      expect(screen.getByText(/İş üyeliğiniz başarıyla aktifleştirildi/)).toBeOnTheScreen(),
    );
    expect(screen.queryByText(/Premium üyeliğiniz/)).toBeNull();
    // Kademeye özel özellik
    expect(screen.getByText('API erişimi')).toBeOnTheScreen();
  });

  it('J14.S2 tier=basic → "Temel" gösterir', async () => {
    mockParams = { tier: 'basic', paymentId: 'pay1' };
    renderWithProviders(<MembershipSuccessScreen />);
    await waitFor(() =>
      expect(screen.getByText(/Temel üyeliğiniz başarıyla aktifleştirildi/)).toBeOnTheScreen(),
    );
    expect(screen.getByText('15 ücretsiz ilan')).toBeOnTheScreen();
  });

  it('J14.S3 tier eksik/bilinmeyen → premium fallback', async () => {
    mockParams = { paymentId: 'pay1' };
    renderWithProviders(<MembershipSuccessScreen />);
    await waitFor(() =>
      expect(screen.getByText(/Premium üyeliğiniz başarıyla aktifleştirildi/)).toBeOnTheScreen(),
    );
  });
});
