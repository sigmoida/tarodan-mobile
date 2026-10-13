/**
 * B3 inceleme 3 · Hesap silme engelinde yalnız izlenebilecek yollar:
 * "İlanlarımı yönet" yalnız kapatılabilir (aktif / onay bekleyen) ilan
 * varken; rezerve ilan satışa bağlıdır → durum anlatılır, Satışlarım yolu.
 */
import React from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { makeTestQueryClient } from '@/test-utils';
import { pushMock, resetRouterMocks } from '@/test-utils/router-mock';

jest.mock('expo-router', () => require('@/test-utils/router-mock').routerMock);
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string, o?: Record<string, unknown>) => (o ? `${k}:${JSON.stringify(o)}` : k),
  }),
}));
jest.mock('@/ui', () => ({ appAlert: jest.fn() }));
jest.mock('@/lib/api', () => ({
  errorText: jest.requireActual('@/lib/api/errorText').errorText,
  userApi: { deleteAccount: jest.fn() },
  productsApi: { getMyStats: jest.fn() },
}));

import { appAlert } from '@/ui';
import { productsApi, userApi } from '@/lib/api';
import { useProfileActions } from '../useProfileActions';

const mockAlert = appAlert as jest.Mock;
const mockDelete = userApi.deleteAccount as jest.Mock;
const mockStats = productsApi.getMyStats as jest.Mock;

const blocked = (details: Record<string, number>, errors: string[]) => ({
  response: {
    status: 400,
    data: { message: 'Engeller:', i18nKey: 'server.user.deleteAccountBlocked', errors, details },
  },
});

const stats = (counts: Record<string, number>) => ({ data: { counts } });

/** Onay penceresinde "Hesabı sil"e bas, engel uyarısını döndür. */
async function deleteAndGetBlockedAlert() {
  const client = makeTestQueryClient();
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useProfileActions(), { wrapper });
  act(() => result.current.handleDeleteAccount());
  const confirm = mockAlert.mock.calls[0]![2] as { style?: string; onPress?: () => Promise<void> }[];
  await act(async () => {
    await confirm.find((b) => b.style === 'destructive')!.onPress!();
  });
  const [title, message, buttons] = mockAlert.mock.calls[1]!;
  return {
    title: title as string,
    message: message as string,
    labels: ((buttons ?? []) as { text: string }[]).map((b) => b.text),
    press: (label: string) =>
      ((buttons ?? []) as { text: string; onPress?: () => void }[])
        .find((b) => b.text === label)!
        .onPress!(),
  };
}

beforeEach(() => {
  mockAlert.mockReset();
  mockDelete.mockReset();
  mockStats.mockReset();
  resetRouterMocks();
});

describe('useProfileActions · hesap silme engeli', () => {
  it('kapatılabilir aktif ilan → "İlanlarımı yönet" İlanlarım\'ı açar', async () => {
    mockDelete.mockRejectedValue(blocked({ activeProducts: 2 }, ['2 aktif ilanınız var.']));
    mockStats.mockResolvedValue(stats({ active: 2, pending: 0, reserved: 0 }));
    const alert = await deleteAndGetBlockedAlert();

    expect(alert.title).toBe('profile.cannotDeleteAccount');
    expect(alert.message).toBe('Engeller:\n• 2 aktif ilanınız var.');
    expect(alert.labels).toEqual(['common.close', 'profile.deleteBlockedManageListings']);
    alert.press('profile.deleteBlockedManageListings');
    expect(pushMock).toHaveBeenCalledWith('/settings/my-listings');
  });

  it('yalnız rezerve ilan: "İlanlarımı yönet" YOK; durum anlatılır, Satışlarım açılır', async () => {
    mockDelete.mockRejectedValue(
      blocked({ activeProducts: 1, pendingOrders: 1 }, ['1 aktif ilanınız var.', '1 bekleyen sipariş.']),
    );
    mockStats.mockResolvedValue(stats({ active: 0, pending: 0, reserved: 1 }));
    const alert = await deleteAndGetBlockedAlert();

    expect(alert.labels).toEqual(['common.close', 'mobile.quickMySales']);
    expect(alert.message).toContain('profile.deleteBlockedReservedNote:{"count":1}');
    alert.press('mobile.quickMySales');
    expect(pushMock).toHaveBeenCalledWith('/sales');
  });

  it('ilan engeli yok, bekleyen sipariş var → Siparişlerim; sayaç sorulmaz', async () => {
    mockDelete.mockRejectedValue(blocked({ activeProducts: 0, pendingOrders: 1 }, ['1 bekleyen sipariş.']));
    const alert = await deleteAndGetBlockedAlert();

    expect(mockStats).not.toHaveBeenCalled();
    expect(alert.labels).toEqual(['common.close', 'nav.myOrders']);
    alert.press('nav.myOrders');
    expect(pushMock).toHaveBeenCalledWith('/orders');
  });

  it('sayaçlar alınamazsa ilan engelinde İlanlarım yolu yine verilir', async () => {
    mockDelete.mockRejectedValue(blocked({ activeProducts: 1 }, ['1 aktif ilanınız var.']));
    mockStats.mockRejectedValue(new Error('Network'));
    const alert = await deleteAndGetBlockedAlert();
    expect(alert.labels).toEqual(['common.close', 'profile.deleteBlockedManageListings']);
  });

  it('ağ hatası: genel hata, yol düğmesi yok', async () => {
    mockDelete.mockRejectedValue(new Error('Network'));
    const alert = await deleteAndGetBlockedAlert();
    expect(alert.title).toBe('common.error');
    expect(alert.message).toBe('profile.deleteAccountFailed');
    expect(alert.labels).toEqual([]);
  });
});
