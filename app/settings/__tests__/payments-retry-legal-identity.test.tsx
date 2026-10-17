/**
 * B4 inceleme 5 · Ayarlar → Ödemelerim → "Tekrar Dene": kimlik kapısı onay
 * penceresinden ÖNCE açılır (onay kapanırken native kapı açılırsa iOS donar).
 * "Vazgeç"te ne onay ne `paymentsApi.retry`.
 *
 * B4 inceleme tur 2 · 4: retry mutasyon hook'unda (`useDoRetryPayment`);
 * kart spinner'ı `mutation.variables`'tan. Kontrol sürerken ikinci basış yok
 * sayılır, spinner başka karta kaymaz, diğer kartlar devre dışı.
 */
import React from 'react';
import { act, fireEvent, renderHook, screen, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { makeTestQueryClient, renderWithProviders } from '@/test-utils';
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
import { pushMock } from '@/test-utils/router-mock';
import { usePayments } from '../payments/_hooks/usePayments';
import PaymentsScreen from '../payments';

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
    expect(result.current.retryPendingId).toBe('pay-9');

    await settleGateAndWait(true);
    expect(result.current.retryPendingId).toBeNull();
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
    expect(result.current.retryPendingId).toBeNull();
  });

  it('kontrol sürerken başka karta basış yok sayılır; spinner ilk kartta kalır', async () => {
    const { result } = renderHook(() => usePayments(), { wrapper });
    act(() => {
      void result.current.handleRetry('pay-9');
    });
    await gateOpened();
    expect(result.current.retryBusy).toBe(true);

    await act(async () => {
      await result.current.handleRetry('pay-7');
    });
    expect(result.current.retryPendingId).toBe('pay-9');
    expect(legalIdentityApi.getStatus).toHaveBeenCalledTimes(1);

    await settleGateAndWait(true);
    expect(appAlert).toHaveBeenCalledTimes(1);
    const buttons = (appAlert as jest.Mock).mock.calls[0]![2] as Array<{ style?: string; onPress?: () => unknown }>;
    await act(async () => {
      await buttons.find((b) => b.style !== 'cancel')!.onPress!();
    });
    expect(paymentsApi.retry).toHaveBeenCalledTimes(1);
    expect(paymentsApi.retry).toHaveBeenCalledWith('pay-9');
  });

  it('aynı anda iki basış (aynı render) → yalnız ilki; değişken üzerine yazılmaz', async () => {
    const { result } = renderHook(() => usePayments(), { wrapper });
    act(() => {
      void result.current.handleRetry('pay-9');
      void result.current.handleRetry('pay-7');
    });
    await gateOpened();
    expect(result.current.retryPendingId).toBe('pay-9');
  });

  it('retry isteği uçuştayken spinner o kartta (mutation.variables), bitince yönlendirme', async () => {
    let resolveRetry!: (v: unknown) => void;
    (paymentsApi.retry as jest.Mock).mockImplementationOnce(
      () => new Promise((r) => { resolveRetry = r; }),
    );
    (legalIdentityApi.getStatus as jest.Mock).mockResolvedValue({
      data: { ...MISSING_LEGAL_IDENTITY, required: false, missing: [] },
    });
    const { result } = renderHook(() => usePayments(), { wrapper });
    await act(async () => {
      await result.current.handleRetry('pay-3');
    });
    const buttons = (appAlert as jest.Mock).mock.calls[0]![2] as Array<{ style?: string; onPress?: () => unknown }>;
    act(() => {
      buttons.find((b) => b.style !== 'cancel')!.onPress!();
    });
    await waitFor(() => expect(result.current.retryPendingId).toBe('pay-3'));
    expect(result.current.retryBusy).toBe(true);

    await act(async () => {
      resolveRetry({ data: { paymentUrl: 'https://pay.example/y' } });
    });
    await waitFor(() => expect(result.current.retryPendingId).toBeNull());
    expect(result.current.retryBusy).toBe(false);
    expect(pushMock).toHaveBeenCalledWith(
      expect.objectContaining({ params: { id: 'pay-3', paymentUrl: 'https://pay.example/y' } }),
    );
  });

  it('ekran: kontrol sürerken TÜM "Tekrar Dene" düğmeleri devre dışı, yükleniyor yalnız basılan kartta', async () => {
    const failed = (id: string) => ({
      id,
      orderId: `order-${id}-xxxxxxxx`,
      amount: 100,
      provider: 'paytr',
      status: 'failed',
      createdAt: '2026-01-01T00:00:00Z',
    });
    (paymentsApi.getMyPayments as jest.Mock).mockResolvedValue({ data: [failed('pay-1'), failed('pay-2')] });
    renderWithProviders(<PaymentsScreen />);
    await waitFor(() => expect(screen.getByTestId('payment-retry-pay-1')).toBeOnTheScreen());

    fireEvent.press(screen.getByTestId('payment-retry-pay-1'));
    await gateOpened();
    await waitFor(() => expect(screen.getByTestId('payment-retry-pay-2')).toBeDisabled());
    expect(screen.getByTestId('payment-retry-pay-1')).toBeDisabled();
    expect(screen.getByTestId('payment-retry-pay-1').props.accessibilityState).toEqual(
      expect.objectContaining({ busy: true }),
    );
    expect(screen.getByTestId('payment-retry-pay-2').props.accessibilityState).toEqual(
      expect.objectContaining({ busy: false }),
    );

    fireEvent.press(screen.getByTestId('payment-retry-pay-2'));
    expect(legalIdentityApi.getStatus).toHaveBeenCalledTimes(1);
  });
});
