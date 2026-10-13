/**
 * Üyelik yönetimi: başarı `toast.success`, hata `toast.error` (sunucu mesajı, dizi dahil) — nötr
 * `toast()` değil (kırmızı hata görünümü + erişilebilirlik rolü).
 */
import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from '@/ui';

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
jest.mock('@/ui', () => ({
  ...jest.requireActual('@/ui'),
  appAlert: jest.fn(),
  toast: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn(), dismiss: jest.fn() }),
}));
jest.mock('@/services/sentry', () => ({ captureException: jest.fn() }));
jest.mock('@/lib/api', () => ({
  membershipApi: {
    getCurrentMembership: jest.fn(),
    cancel: jest.fn(),
    setAutoRenew: jest.fn(),
    cancelScheduledChange: jest.fn(),
  },
}));
import { membershipApi } from '@/lib/api';
import { useMembershipManage } from '../manage/_hooks/useMembershipManage';

const api = membershipApi as unknown as Record<string, jest.Mock>;

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(() => useMembershipManage(), { wrapper });
}

beforeEach(() => {
  Object.values(api).forEach((m) => m.mockReset());
  api.getCurrentMembership.mockResolvedValue({ data: { tier: { type: 'premium' }, autoRenew: true } });
  (toast as unknown as jest.Mock).mockClear();
  (toast.success as jest.Mock).mockClear();
  (toast.error as jest.Mock).mockClear();
});

it('otomatik yenileme başarısı -> toast.success', async () => {
  api.setAutoRenew.mockResolvedValue({});
  const { result } = setup();
  await act(async () => {
    result.current.autoRenewMutation.mutate(false);
  });
  await waitFor(() => expect(toast.success).toHaveBeenCalledWith('membership.autoRenewOff'));
  expect(toast as unknown as jest.Mock).not.toHaveBeenCalled();
});

it('iptal hatası -> toast.error (dizi mesajın ilk elemanı)', async () => {
  api.cancel.mockRejectedValue({ response: { data: { message: ['Aktif aboneliğiniz yok'] } } });
  const { result } = setup();
  await act(async () => {
    result.current.cancelMutation.mutate();
  });
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Aktif aboneliğiniz yok'));
  expect(toast.success).not.toHaveBeenCalled();
});

it('mesaj yoksa yedek metin: otomatik yenileme + planlı değişiklik iptali', async () => {
  api.setAutoRenew.mockRejectedValue({ response: { data: {} } });
  api.cancelScheduledChange.mockRejectedValue({ response: { data: {} } });
  const { result } = setup();
  await act(async () => {
    result.current.autoRenewMutation.mutate(true);
  });
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith('listing.actionFailed'));
  (toast.error as jest.Mock).mockClear();
  await act(async () => {
    result.current.cancelScheduledChangeMutation.mutate();
  });
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith('listing.actionFailed'));
});
