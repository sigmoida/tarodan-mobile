/**
 * J14 · Üyelik başarı ekranı (membership/success).
 * Bulgu #14 regresyonu: ekran daima "Premium" yazıyordu; `?tier=` paramı yok
 * sayılıyordu. Burada içerik kademeye göre uyarlanıyor mu doğrulanır.
 */
import React from 'react';
import { screen, waitFor } from '@testing-library/react-native';
import { renderWithProviders, captureHardwareBack } from '@/test-utils';
import { replaceMock, resetRouterMocks } from '@/test-utils/router-mock';

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
import {
  __resetVerifyPacer,
  requestVerify,
  startVerifyLoop,
  VERIFY_BUDGET_PER_MIN,
  VERIFY_POLL_BUDGET_PER_MIN,
  VERIFY_TIMEOUT_MS,
  VERIFY_WINDOW_MS,
} from '@/lib/payment/verifyPacer';
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
    // (i18n göçü, bkz. docs/archive/i18n/i18n-uyelik-report.md).
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

  it('J14.B1 Android geri tuşu ödeme ekranına dönmez: ana sayfaya replace eder', async () => {
    mockParams = { tier: 'premium', paymentId: 'pay1' };
    const back = captureHardwareBack();
    try {
      renderWithProviders(<MembershipSuccessScreen />);
      await waitFor(() => expect(mockRefreshUserData).toHaveBeenCalled());
      expect(back.press()).toBe(true);
      expect(replaceMock).toHaveBeenCalledWith('/(tabs)');
    } finally {
      back.restore();
    }
  });

  it('J14.V1 verify kısa zaman aşımı olmadan gider; tamamlandıysa döngü durur', async () => {
    renderWithProviders(<MembershipSuccessScreen />);
    await waitFor(() => expect(mockRefreshUserData).toHaveBeenCalled());
    expect(verify).toHaveBeenCalledTimes(1);
    expect(verify.mock.calls[0]).toEqual(['pay1']); // { timeout: 10 sn } YOK
  });

  it('J14.V2 kart formu 4 dk yokladıktan sonra: bütçede bu ekrana ayrılan yer var, verify beklemeden gider', async () => {
    jest.useFakeTimers();
    const stop = startVerifyLoop('pay1');
    await jest.advanceTimersByTimeAsync(4 * 60_000); // yoklama payının (6) tamamını kullandı
    stop();
    verify.mockClear();
    renderWithProviders(<MembershipSuccessScreen />);
    await jest.advanceTimersByTimeAsync(0);
    expect(verify).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(mockRefreshUserData).toHaveBeenCalled());
    expect(VERIFY_POLL_BUDGET_PER_MIN).toBeLessThan(VERIFY_BUDGET_PER_MIN);
  });

  it('J14.V3 bütçe tamamen doluysa yer açılınca verify gönderilir; tazeleme verify\'dan SONRA', async () => {
    jest.useFakeTimers();
    for (let i = 0; i < VERIFY_BUDGET_PER_MIN; i++) void requestVerify(`card-${i}`);
    verify.mockClear();
    renderWithProviders(<MembershipSuccessScreen />);
    await jest.advanceTimersByTimeAsync(VERIFY_WINDOW_MS - 1);
    expect(verify).not.toHaveBeenCalled(); // hiç verify göndermeden bitmedi: bekliyor
    expect(mockRefreshUserData).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(1);
    expect(verify).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(mockRefreshUserData).toHaveBeenCalled());
  });

  it('J14.V4 verify 15 sn sürer: 10 sn\'de terk edilmez, sonucu beklenir ve tazeleme ondan sonra', async () => {
    jest.useFakeTimers();
    verify.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ data: { completed: true } }), 15_000)),
    );
    renderWithProviders(<MembershipSuccessScreen />);
    await jest.advanceTimersByTimeAsync(VERIFY_TIMEOUT_MS + 1000);
    expect(verify).toHaveBeenCalledTimes(1); // terk edilip yenisi gönderilmedi
    expect(mockRefreshUserData).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(4000);
    await waitFor(() => expect(mockRefreshUserData).toHaveBeenCalled());
    expect(verify).toHaveBeenCalledTimes(1); // tamamlandı: başka deneme yok
  });
});
