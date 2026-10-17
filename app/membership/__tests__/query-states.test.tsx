/**
 * Üyelik ekranı sorgu durumları (React Query geçişi):
 * - Ekrana dönüşte iskelete DÜŞMEZ (eskiden her odakta `setLoading(true)`); veri tazeyse istek yok.
 * - İki istek de düşerse ErrorState + "Tekrar dene" → başarıda içerik gelir.
 * - Biri düşerse diğeri yine gösterilir (eski `allSettled` davranışı).
 */
import React from 'react';
import { act, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient } from '@tanstack/react-query';
import { renderWithProviders } from '@/test-utils';

jest.mock('@/lib/purchases', () => ({
  ...jest.requireActual('@/lib/purchases'),
  CAN_BUY_DIGITAL: true,
}));

// Odak: mount'ta ve geri çağrı kimliği değişince çalışır; `refocus()` ekrana dönüşü taklit eder.
let mockLatestFocusCb: (() => void) | null = null;
jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual<typeof import('react')>('react');
  const base = jest.requireActual('@/test-utils/router-mock').routerMock;
  return {
    ...base,
    useFocusEffect: (cb: () => void) => {
      mockLatestFocusCb = cb;
      useEffect(() => cb(), [cb]);
    },
  };
});
const refocus = () => act(() => mockLatestFocusCb?.());

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAuthState: any = { isAuthenticated: true, user: {} };
jest.mock('@/stores/authStore', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useAuthStore: (sel?: (state: any) => unknown) => (sel ? sel(mockAuthState) : mockAuthState),
}));

jest.mock('@/lib/api', () => ({
  api: { get: jest.fn() },
  membershipApi: { getCurrentMembership: jest.fn(), getTiers: jest.fn() },
}));
import { membershipApi } from '@/lib/api';
const mockGetMembership = membershipApi.getCurrentMembership as jest.Mock;
const mockGetTiers = membershipApi.getTiers as jest.Mock;

import MembershipScreen from '../index';

beforeEach(() => {
  jest.clearAllMocks();
  mockLatestFocusCb = null;
  mockGetMembership.mockResolvedValue({ data: { tier: { type: 'free', name: 'Ücretsiz' } } });
  mockGetTiers.mockResolvedValue({ data: [] });
});

describe('membership sorgu durumları', () => {
  it('ekrana dönüşte iskelete düşmez ve taze veride yeniden istek atmaz', async () => {
    // Prod gibi staleTime (client.ts: 5 dk) — test istemcisinin varsayılanı 0 (hep bayat).
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 5 * 60_000 } },
    });
    renderWithProviders(<MembershipScreen />, { queryClient });
    await waitFor(() => expect(screen.getByText('membership.basic')).toBeOnTheScreen());
    expect(mockGetMembership).toHaveBeenCalledTimes(1);
    expect(mockGetTiers).toHaveBeenCalledTimes(1);

    refocus();
    // İçerik yerinde kalır (eskiden burada iskelete dönülüyordu).
    expect(screen.getByText('membership.basic')).toBeOnTheScreen();
    await act(() => Promise.resolve());
    expect(mockGetMembership).toHaveBeenCalledTimes(1);
    expect(mockGetTiers).toHaveBeenCalledTimes(1);
  });

  it('dönüşte bayat veriyi arka planda tazeler, içerik yerinde kalır', async () => {
    renderWithProviders(<MembershipScreen />); // test istemcisi: staleTime 0 → hep bayat
    await waitFor(() => expect(screen.getByText('membership.basic')).toBeOnTheScreen());
    refocus();
    expect(screen.getByText('membership.basic')).toBeOnTheScreen();
    await waitFor(() => expect(mockGetMembership).toHaveBeenCalledTimes(2));
    expect(screen.getByText('membership.basic')).toBeOnTheScreen();
  });

  it('iki istek de düşerse ErrorState gösterir; yeniden dene içerik getirir', async () => {
    mockGetMembership.mockRejectedValueOnce(new Error('net'));
    mockGetTiers.mockRejectedValueOnce(new Error('net'));
    renderWithProviders(<MembershipScreen />);
    await waitFor(() => expect(screen.getByTestId('error-state')).toBeOnTheScreen());
    expect(screen.getByText('membership.loadError')).toBeOnTheScreen();

    fireEvent.press(screen.getByText('mobile.errorRetry'));
    await waitFor(() => expect(screen.getByText('membership.basic')).toBeOnTheScreen());
    expect(screen.queryByTestId('error-state')).toBeNull();
  });

  it('yalnız üyelik düşerse paketler yine gösterilir (ErrorState yok)', async () => {
    mockGetMembership.mockRejectedValueOnce(new Error('net'));
    renderWithProviders(<MembershipScreen />);
    await waitFor(() => expect(screen.getByText('membership.basic')).toBeOnTheScreen());
    expect(screen.queryByTestId('error-state')).toBeNull();
  });
});
