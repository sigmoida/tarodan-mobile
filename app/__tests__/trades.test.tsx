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
});
