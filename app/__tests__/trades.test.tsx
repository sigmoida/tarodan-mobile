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
    (tradesApi.getAll as jest.Mock).mockReset().mockResolvedValue({ data: { trades: [] } });
  });

  it('giriş yoksa giriş çağrısı çıkar ve giriş sayfasına gider', () => {
    mockAuth = { isAuthenticated: false, user: null };
    renderWithProviders(<TradesScreen />);
    fireEvent.press(screen.getByText('Giriş Yap'));
    expect(pushMock).toHaveBeenCalledWith('/(auth)/login');
  });

  it('filtre chip\'leri sunucu sayaçlarını taşır; sayaçsız filtreler yalnız etiket', async () => {
    renderWithProviders(<TradesScreen />);
    expect(await screen.findByText('Tümü (5)')).toBeOnTheScreen();
    expect(screen.getByText('Bekleyen (2)')).toBeOnTheScreen();
    expect(screen.getByText('Kargoda (1)')).toBeOnTheScreen();
    expect(screen.getByText('İptal')).toBeOnTheScreen();
  });

  it('boş listede boş durum çıkar ve filtre chip\'leri görünür kalır', async () => {
    renderWithProviders(<TradesScreen />);
    await waitFor(() => expect(tradesApi.getAll).toHaveBeenCalled());
    expect(await screen.findByText('Tümü (5)')).toBeOnTheScreen();
    expect(await screen.findByText('Henüz takas teklifiniz yok')).toBeOnTheScreen();
  });
});
