/**
 * Takaslarım listesi — PageShell + sayaçlı filtre chip'leri + boş durum + giriş kapısı.
 */
import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';

jest.mock('expo-router', () => require('@/test-utils/router-mock').routerMock);

jest.mock('@/lib/api', () => ({
  tradesApi: {
    getAll: jest.fn(),
    getStatusCounts: jest.fn(() =>
      Promise.resolve({ data: { all: 5, pending: 2, shipping: 1, completed: 2 } }),
    ),
  },
}));
import { tradesApi } from '@/lib/api';
import { pushMock, resetRouterMocks } from '@/test-utils/router-mock';

let mockAuth: { isAuthenticated: boolean; user: { id: string } | null } = {
  isAuthenticated: true,
  user: { id: 'u1' },
};
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (state: any) => unknown) => (sel ? sel(mockAuth) : mockAuth),
}));

import TradesScreen from '../trades';

describe('Takaslarım', () => {
  beforeEach(() => {
    resetRouterMocks();
    mockAuth = { isAuthenticated: true, user: { id: 'u1' } };
    // İptal / Reddedilen sayaçları `getAll({status, pageSize:1}).total` ile gelir.
    (tradesApi.getAll as jest.Mock)
      .mockReset()
      .mockImplementation((params?: { status?: string; pageSize?: string }) =>
        Promise.resolve({
          data: {
            trades: [],
            total: params?.status === 'cancelled' ? 3 : params?.status === 'rejected' ? 1 : 0,
          },
        }),
      );
  });

  it('giriş yoksa giriş çağrısı çıkar ve giriş sayfasına gider', () => {
    mockAuth = { isAuthenticated: false, user: null };
    renderWithProviders(<TradesScreen />);
    fireEvent.press(screen.getByText('Giriş Yap'));
    expect(pushMock).toHaveBeenCalledWith('/(auth)/login');
  });

  it('tüm filtre sekmeleri sayaç taşır (İptal / Reddedilen dahil — tutarlı tek kural)', async () => {
    renderWithProviders(<TradesScreen />);
    expect(await screen.findByLabelText('Tümü (5)')).toBeOnTheScreen();
    expect(screen.getByLabelText('Bekleyen (2)')).toBeOnTheScreen();
    expect(screen.getByLabelText('Kargoda (1)')).toBeOnTheScreen();
    expect(screen.getByLabelText('Tamamlanan (2)')).toBeOnTheScreen();
    expect(screen.getByLabelText('İptal (3)')).toBeOnTheScreen();
    expect(screen.getByLabelText('Reddedilen (1)')).toBeOnTheScreen();
  });

  it('boş listede boş durum çıkar ve filtre chip\'leri görünür kalır', async () => {
    renderWithProviders(<TradesScreen />);
    await waitFor(() => expect(tradesApi.getAll).toHaveBeenCalled());
    expect(await screen.findByLabelText('Tümü (5)')).toBeOnTheScreen();
    expect(await screen.findByText('Henüz takas teklifiniz yok')).toBeOnTheScreen();
  });
  it('filtre (chip) değişince önceki liste yerinde kalır; iskelete düşmez', async () => {
    const trade = {
      id: 't1',
      tradeNumber: 'T-1',
      status: 'pending',
      createdAt: '2026-01-01T00:00:00.000Z',
      initiatorId: 'u1',
      receiverName: 'Ayşe Demir',
      initiatorItems: [],
      receiverItems: [],
    };
    let resolvePending!: (v: unknown) => void;
    (tradesApi.getAll as jest.Mock).mockImplementation(
      (params?: { status?: string; pageSize?: string }) => {
        if (params?.pageSize === '1') return Promise.resolve({ data: { trades: [], total: 0 } });
        if (params?.status === 'pending') return new Promise((r) => { resolvePending = r; });
        return Promise.resolve({ data: { trades: [trade], total: 1 } });
      },
    );
    renderWithProviders(<TradesScreen />);
    expect(await screen.findByText('Ayşe Demir')).toBeOnTheScreen();

    fireEvent.press(await screen.findByLabelText('Bekleyen (2)'));
    // Yeni filtre yüklenirken (istek çözülmedi) önceki liste ekranda, iskelet yok.
    await waitFor(() => expect(tradesApi.getAll).toHaveBeenCalledWith(expect.objectContaining({ status: 'pending' })));
    expect(screen.getByText('Ayşe Demir')).toBeOnTheScreen();
    expect(screen.queryByTestId('trades-skeleton')).toBeNull();
    resolvePending({ data: { trades: [], total: 0 } });
  });
});
