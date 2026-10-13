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
// Satın almanın açık olduğu platform (Android). iOS'ta ekran /membership'e
// yönlendirir — ios-success-redirect.test.tsx.
jest.mock('@/lib/purchases', () => ({ CAN_BUY_DIGITAL: true }));
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (state: any) => unknown) => {
    const state: any = ({ refreshUserData: mockRefreshUserData });
    return sel ? sel(state) : state;
  },
}));

jest.mock('@/lib/api', () => ({
  paymentsApi: { verify: jest.fn().mockResolvedValue({ data: { completed: true } }) },
}));

import { paymentsApi } from '@/lib/api';
import { __resetVerifyPacer, requestVerify, VERIFY_BUDGET_PER_MIN, VERIFY_TIMEOUT_MS } from '@/lib/payment/verifyPacer';
import MembershipSuccessScreen from '../success';

describe('J14 · üyelik başarı ekranı (membership/success)', () => {
  beforeEach(() => {
    resetRouterMocks();
    mockRefreshUserData.mockClear();
    mockParams = {};
    __resetVerifyPacer();
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

describe('J14.V · üyelik başarı ekranı verify\'ı pacer\'dan gönderir (ortak bütçe)', () => {
  const verify = paymentsApi.verify as jest.Mock;

  beforeEach(() => {
    resetRouterMocks();
    mockRefreshUserData.mockClear();
    __resetVerifyPacer();
    verify.mockReset().mockResolvedValue({ data: { completed: true } });
    mockParams = { tier: 'premium', paymentId: 'pay1' };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('J14.V1 verify zaman aşımıyla (pacer) gider; tamamlandıysa döngü durur', async () => {
    renderWithProviders(<MembershipSuccessScreen />);
    await waitFor(() => expect(mockRefreshUserData).toHaveBeenCalled());
    expect(verify).toHaveBeenCalledTimes(1);
    expect(verify).toHaveBeenCalledWith('pay1', { timeout: VERIFY_TIMEOUT_MS });
  });

  it('J14.V2 bütçe doluysa (kart ödemesi harcadı) verify gönderilmez, ekran yine tazelenir', async () => {
    jest.useFakeTimers();
    for (let i = 0; i < VERIFY_BUDGET_PER_MIN; i++) void requestVerify(`card-${i}`);
    verify.mockClear();
    renderWithProviders(<MembershipSuccessScreen />);
    await jest.advanceTimersByTimeAsync(6000); // 5 tur × 1,2 sn
    expect(verify).not.toHaveBeenCalled();
    expect(mockRefreshUserData).toHaveBeenCalled();
  });
});
