/**
 * B4 inceleme 5 · Ödeme yeniden denemesi yeni bir ödeme başlatır: önce yasal
 * kimlik kapısı. Gerçek `ensureLegalIdentity` + istek store'u; "Vazgeç"te
 * `paymentsApi.retry` GİTMEZ. Misafirde Tekrar Dene hiç yok (web ile aynı; A tur 3).
 */
import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { MISSING_LEGAL_IDENTITY, settleGateAndWait } from '@/test-utils/legalIdentity';

let mockParams: Record<string, string> = { paymentId: 'pay-1' };
jest.mock('expo-router', () => ({
  ...require('@/test-utils/router-mock').routerMock,
  useLocalSearchParams: () => mockParams,
}));

jest.mock('@/lib/api', () => ({
  legalIdentityApi: { getStatus: jest.fn(), submit: jest.fn() },
  paymentsApi: {
    confirmFailed: jest.fn(() => Promise.resolve(null)),
    confirmFailedGuest: jest.fn(() => Promise.resolve(null)),
    getStatusLight: jest.fn(() => Promise.resolve({ data: { data: { id: 'pay-1', status: 'failed' } } })),
    getStatus: jest.fn(() => Promise.resolve({ data: { data: { id: 'pay-1', status: 'failed' } } })),
    getStatusLightGuest: jest.fn(() => Promise.resolve({ data: { data: { id: 'pay-1', status: 'failed' } } })),
    retry: jest.fn(() => Promise.resolve({ data: {} })),
  },
}));

jest.mock('@/lib/payment/paymentCapability', () => ({
  forgetPaymentCapabilityIfFinal: jest.fn(() => Promise.resolve()),
}));

import { legalIdentityApi, paymentsApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import {
  settleLegalIdentityRequest,
  useLegalIdentityRequestStore,
} from '@/stores/legalIdentityRequestStore';
import PaymentFailScreen from '../fail';

const gateOpened = () =>
  waitFor(() => expect(useLegalIdentityRequestStore.getState().requested).toBe(true));

async function pressRetry() {
  renderWithProviders(<PaymentFailScreen />);
  await waitFor(() => expect(paymentsApi.getStatusLight).toHaveBeenCalled());
  await act(async () => {
    fireEvent.press(screen.getByTestId('payment-retry-button'));
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { paymentId: 'pay-1' };
  (legalIdentityApi.getStatus as jest.Mock).mockResolvedValue({ data: MISSING_LEGAL_IDENTITY });
  useAuthStore.setState({ isAuthenticated: true, isLoading: false, user: { id: 'u1' } as any });
});

afterEach(() => {
  act(() => settleLegalIdentityRequest(false));
  useAuthStore.setState({ isAuthenticated: false, user: null });
});

describe('Ödeme başarısız · Tekrar Dene · yasal kimlik kapısı', () => {
  it('kimlik eksik → kapı açılır, retry gitmez, düğme devre dışı; kaydedilince retry gider', async () => {
    await pressRetry();

    await gateOpened();
    expect(paymentsApi.retry).not.toHaveBeenCalled();
    expect(screen.getByTestId('payment-retry-button')).toBeDisabled();

    act(() => settleLegalIdentityRequest(true));
    await waitFor(() => expect(paymentsApi.retry).toHaveBeenCalledWith('pay-1'));
  });

  it('Vazgeç → retry isteği gitmez', async () => {
    await pressRetry();

    await gateOpened();
    await settleGateAndWait(false);
    expect(paymentsApi.retry).not.toHaveBeenCalled();
    expect(screen.getByTestId('payment-retry-button')).not.toBeDisabled();
  });

  it('misafirde Tekrar Dene yok (web gibi): kimlik kapısı ve retry çağrılmaz', async () => {
    useAuthStore.setState({ isAuthenticated: false, user: null });
    mockParams = { paymentId: 'pay-1', guest: '1' };
    renderWithProviders(<PaymentFailScreen />);
    await waitFor(() => expect(paymentsApi.getStatusLightGuest).toHaveBeenCalled());

    expect(screen.queryByTestId('payment-retry-button')).toBeNull();
    expect(paymentsApi.retry).not.toHaveBeenCalled();
    expect(legalIdentityApi.getStatus).not.toHaveBeenCalled();
  });
});
