/**
 * B4 inceleme 5 · Ayarlar → Ödemelerim → "Tekrar Dene": kimlik kapısı onay
 * penceresinden ÖNCE açılır (onay kapanırken native kapı açılırsa iOS donar).
 * "Vazgeç"te ne onay ne `paymentsApi.retry`.
 */
import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { makeTestQueryClient } from '@/test-utils';
import { MISSING_LEGAL_IDENTITY, settleGateAndWait } from '@/test-utils/legalIdentity';

jest.mock('expo-router', () => require('@/test-utils/router-mock').routerMock);

jest.mock('@/lib/api', () => ({
  legalIdentityApi: { getStatus: jest.fn(), submit: jest.fn() },
  paymentsApi: {
    getMyPayments: jest.fn(() => Promise.resolve({ data: [] })),
    retry: jest.fn(() => Promise.resolve({ data: { paymentUrl: 'https://pay.example/x' } })),
    cancel: jest.fn(),
  },
}));

import { legalIdentityApi, paymentsApi } from '@/lib/api';
import { appAlert } from '@/ui'; // jest.setup'ta global jest.fn
import { useAuthStore } from '@/stores/authStore';
import {
  settleLegalIdentityRequest,
  useLegalIdentityRequestStore,
} from '@/stores/legalIdentityRequestStore';
import { usePayments } from '../payments/_hooks/usePayments';

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={makeTestQueryClient()}>{children}</QueryClientProvider>;
}

const gateOpened = () =>
  waitFor(() => expect(useLegalIdentityRequestStore.getState().requested).toBe(true));

beforeEach(() => {
  jest.clearAllMocks();
  (legalIdentityApi.getStatus as jest.Mock).mockResolvedValue({ data: MISSING_LEGAL_IDENTITY });
  useAuthStore.setState({ isAuthenticated: true, isLoading: false, user: { id: 'u1' } as any });
});

afterEach(() => {
  act(() => settleLegalIdentityRequest(false));
  useAuthStore.setState({ isAuthenticated: false, user: null });
});

describe('Ödemelerim · Tekrar Dene · yasal kimlik kapısı', () => {
  it('kimlik eksik → kapı onaydan önce; kaydedilince onay, "Devam" ile retry', async () => {
    const { result } = renderHook(() => usePayments(), { wrapper });
    act(() => {
      void result.current.handleRetry('pay-9');
    });

    await gateOpened();
    expect(appAlert).not.toHaveBeenCalled();
    expect(result.current.retryCheckingId).toBe('pay-9');

    await settleGateAndWait(true);
    expect(result.current.retryCheckingId).toBeNull();
    expect(appAlert).toHaveBeenCalledTimes(1);
    const buttons = (appAlert as jest.Mock).mock.calls[0]![2] as Array<{ style?: string; onPress?: () => unknown }>;
    await act(async () => {
      await buttons.find((b) => b.style !== 'cancel')!.onPress!();
    });
    expect(paymentsApi.retry).toHaveBeenCalledWith('pay-9');
  });

  it('Vazgeç → onay de retry isteği de yok', async () => {
    const { result } = renderHook(() => usePayments(), { wrapper });
    act(() => {
      void result.current.handleRetry('pay-9');
    });

    await gateOpened();
    await settleGateAndWait(false);
    expect(appAlert).not.toHaveBeenCalled();
    expect(paymentsApi.retry).not.toHaveBeenCalled();
    expect(result.current.retryCheckingId).toBeNull();
  });
});
