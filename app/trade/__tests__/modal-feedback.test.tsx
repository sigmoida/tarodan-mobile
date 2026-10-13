/**
 * Takas itiraz / reddet modalları — geri bildirim sözleşmesi (CLAUDE.md §12):
 *  - doğrulama hatası modal İÇİNDE satır içi (toast açık native Modal'ın altında kalırdı);
 *  - geçerliyse modal ÖNCE kapanır, mutation SONRA başlar (isPending beklenmez);
 *  - sonuç `toast.success`, hata `toast.error` (nötr `toast()` değil).
 */
import React from 'react';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from '@/ui';
import { tradesApi } from '@/lib/api';
import { DEFAULT_DISPUTE_REASON } from '../[id]/_lib/disputeReasons';
import { DisputeTradeModal } from '../[id]/_modals/DisputeTradeModal';
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

describe('itiraz modalı', () => {
  it('kısa açıklama: modal AÇIK kalır, hata satır içi, istek ve toast YOK', () => {
    const { result } = setupHook();
    act(() => result.current.dispute.open());
    act(() => result.current.dispute.setDescription('kısa'));
    act(() => result.current.dispute.submit());

    expect(result.current.dispute.visible).toBe(true);
    expect(result.current.dispute.error).toBe('trade.dispute.minLengthError');
    expect(api.raiseDispute).not.toHaveBeenCalled();
    expect(toastMock).not.toHaveBeenCalled();
    expect(errorMock).not.toHaveBeenCalled();
  });

  it('hata yazmaya başlayınca / yeniden açılınca temizlenir', () => {
    const { result } = setupHook();
    act(() => result.current.dispute.open());
    act(() => result.current.dispute.submit());
    expect(result.current.dispute.error).toBeTruthy();
    act(() => result.current.dispute.setDescription('d'));
    expect(result.current.dispute.error).toBeNull();

    act(() => result.current.dispute.submit());
    expect(result.current.dispute.error).toBeTruthy();
    act(() => result.current.dispute.close());
    act(() => result.current.dispute.open());
    expect(result.current.dispute.error).toBeNull();
  });

  it('modal satır içi hatayı alan altında gösterir', () => {
    render(
      <DisputeTradeModal
        visible
        onClose={() => {}}
        reason={DEFAULT_DISPUTE_REASON}
        setReason={() => {}}
        description="kısa"
        setDescription={() => {}}
        onSubmit={() => {}}
        error="trade.dispute.minLengthError"
        t={((k: string) => k) as any}
      />,
    );
    expect(screen.getByText('trade.dispute.minLengthError')).toBeTruthy();
  });

  it('geçerli: modal İSTEK BİTMEDEN kapanır (önce kapat, sonra gönder)', async () => {
    let resolve!: (v: unknown) => void;
    api.raiseDispute.mockReturnValue(new Promise((r) => (resolve = r)));
    const { result } = setupHook();
    act(() => result.current.dispute.open());
    act(() => result.current.dispute.setDescription('Kargo kutusu ezik geldi, ürün çalışmıyor.'));
    act(() => result.current.dispute.submit());

    expect(result.current.dispute.visible).toBe(false); // istek hâlâ beklemede
    await waitFor(() => expect(api.raiseDispute).toHaveBeenCalledTimes(1));
    expect(successMock).not.toHaveBeenCalled();

    await act(async () => resolve({ data: {} }));
    await waitFor(() => expect(successMock).toHaveBeenCalledWith('trade.dispute.successMessage'));
    expect(toastMock).not.toHaveBeenCalled();
  });

  it('sunucu hatası: toast.error(sunucu mesajı), açıklama korunur', async () => {
    api.raiseDispute.mockRejectedValue({ response: { data: { message: ['Süre dolmuş'] } } });
    const { result } = setupHook();
    act(() => result.current.dispute.open());
    act(() => result.current.dispute.setDescription('Kargo kutusu ezik geldi, ürün çalışmıyor.'));
    act(() => result.current.dispute.submit());

    await waitFor(() => expect(errorMock).toHaveBeenCalledWith('Süre dolmuş'));
    expect(successMock).not.toHaveBeenCalled();
    expect(toastMock).not.toHaveBeenCalled();
    expect(result.current.dispute.description).toBe('Kargo kutusu ezik geldi, ürün çalışmıyor.');
  });

  it('sunucu mesajı yoksa dispute yedek metni', async () => {
    api.raiseDispute.mockRejectedValue({ response: { data: {} } });
    const { result } = setupHook();
    act(() => result.current.dispute.setDescription('Kargo kutusu ezik geldi, ürün çalışmıyor.'));
    act(() => result.current.dispute.submit());
    await waitFor(() => expect(errorMock).toHaveBeenCalledWith('trade.dispute.errorMessage'));
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
