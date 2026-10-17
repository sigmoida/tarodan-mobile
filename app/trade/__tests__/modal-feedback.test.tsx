/**
 * Takas reddet modalı + diğer aksiyonlar — geri bildirim sözleşmesi (src/ui/CLAUDE.md › iOS modal rule):
 *  - modal ÖNCE kapanır, mutation SONRA başlar (isPending beklenmez);
 *  - sonuç `toast.success`, hata `toast.error` (nötr `toast()` değil).
 * İtiraz ayrı form ekranı: `dispute-screen.test.tsx`.
 */
import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from '@/ui';
import { tradesApi } from '@/lib/api';
import { router } from 'expo-router';
import { useTradeActions } from '../[id]/_hooks/useTradeActions';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, language: 'tr' }),
}));
jest.mock('@/ui', () => ({
  ...jest.requireActual('@/ui'),
  appAlert: jest.fn(),
  toast: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn(), dismiss: jest.fn() }),
}));
jest.mock('@/lib/api', () => ({
  tradesApi: {
    raiseDispute: jest.fn(),
    accept: jest.fn(),
    reject: jest.fn(),
    cancel: jest.fn(),
    confirmReceipt: jest.fn(),
  },
  paymentsApi: { initiateTradeCash: jest.fn() },
}));
jest.mock('@/services/sentry', () => ({ captureException: jest.fn() }));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() } }));

const api = tradesApi as unknown as Record<string, jest.Mock>;
const toastMock = toast as unknown as jest.Mock;
const successMock = toast.success as jest.Mock;
const errorMock = toast.error as jest.Mock;

function setupHook() {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return renderHook(() => useTradeActions('t1'), { wrapper });
}

beforeEach(() => {
  toastMock.mockClear();
  successMock.mockClear();
  errorMock.mockClear();
  Object.values(api).forEach((m) => m.mockReset());
});

describe('itiraz', () => {
  it('artık modal değil: itiraz form ekranına geçer (sözleşme: dispute-screen.test.tsx)', () => {
    const { result } = setupHook();
    act(() => result.current.openDispute());
    expect(router.push).toHaveBeenCalledWith({ pathname: '/trade/[id]/dispute', params: { id: 't1' } });
    expect(api.raiseDispute).not.toHaveBeenCalled();
  });
});

describe('reddet modalı', () => {
  it('modal istek bitmeden kapanır; neden kırpılıp gönderilir; başarıda toast.success + sıfırlanır', async () => {
    let resolve!: (v: unknown) => void;
    api.reject.mockReturnValue(new Promise((r) => (resolve = r)));
    const { result } = setupHook();
    act(() => result.current.reject.open());
    act(() => result.current.reject.setReason('  Uygun değil '));
    act(() => result.current.reject.submit());

    expect(result.current.reject.visible).toBe(false);
    await waitFor(() => expect(api.reject).toHaveBeenCalledWith('t1', 'Uygun değil'));

    await act(async () => resolve({ data: {} }));
    await waitFor(() => expect(successMock).toHaveBeenCalledWith('trade.tradeRejected'));
    expect(result.current.reject.reason).toBe('');
  });

  it('boş neden undefined gider; hata toast.error', async () => {
    api.reject.mockRejectedValue({ response: { data: { message: 'Zaten sonuçlandı' } } });
    const { result } = setupHook();
    act(() => result.current.reject.submit());
    await waitFor(() => expect(api.reject).toHaveBeenCalledWith('t1', undefined));
    await waitFor(() => expect(errorMock).toHaveBeenCalledWith('Zaten sonuçlandı'));
    expect(toastMock).not.toHaveBeenCalled();
  });
});

describe('diğer takas mutation hataları nötr toast() değil toast.error', () => {
  it('onayla', async () => {
    api.confirmReceipt.mockRejectedValue({ response: { data: { message: 'x' } } });
    const { result } = setupHook();
    act(() => result.current.confirm());
    await waitFor(() => expect(errorMock).toHaveBeenCalledWith('x'));
    expect(toastMock).not.toHaveBeenCalled();
  });

  it('onayla başarı -> toast.success', async () => {
    api.confirmReceipt.mockResolvedValue({ data: {} });
    const { result } = setupHook();
    act(() => result.current.confirm());
    await waitFor(() => expect(successMock).toHaveBeenCalledWith('trade.confirmReceipt.successMessage'));
  });
});
