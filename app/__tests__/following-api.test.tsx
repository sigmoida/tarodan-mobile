/**
 * Takip Ettiklerim — gerçek `useFollowing` + API mock'u. Kök neden kilidi: `GET /users/me/following`
 * `{ following: [{ id, followingId, createdAt, following: {...} }] }` döner; eski ayrıştırma bunu
 * dizi saymadığı için ekran HER ZAMAN boş durum gösteriyordu.
 */
import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders, pushMock, resetRouterMocks } from '@/test-utils';

jest.mock('expo-router', () => ({
  ...require('@/test-utils/router-mock').routerMock,
  useFocusEffect: jest.fn(),
}));

jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (state: { isAuthenticated: boolean }) => unknown) => {
    const state = { isAuthenticated: true };
    return sel ? sel(state) : state;
  },
}));

jest.mock('@/lib/api', () => ({
  api: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
}));

import { api } from '@/lib/api';
import FollowingScreen from '../following';

const mockGet = (api as unknown as { get: jest.Mock }).get;

const apiBody = {
  following: [
    {
      id: 'follow-row-1',
      followerId: 'me',
      followingId: 'seller-1',
      createdAt: '2026-01-01T00:00:00Z',
      following: {
        id: 'seller-1',
        publicName: 'Ahmet Koleksiyon',
        displayName: 'Ahmet Y.',
        avatarUrl: null,
        bio: 'Diecast meraklısı',
        _count: { products: 7 },
      },
    },
  ],
};

beforeEach(() => {
  resetRouterMocks();
  mockGet.mockReset();
});

describe('Takip Ettiklerim — API yanıtı', () => {
  it('API biçimindeki takip edilen satıcıları listeler ve satıcı sayfasına götürür', async () => {
    mockGet.mockResolvedValue({ data: apiBody });
    renderWithProviders(<FollowingScreen />);

    expect(await screen.findByText('Ahmet Koleksiyon')).toBeOnTheScreen();
    expect(mockGet).toHaveBeenCalledWith('/users/me/following');
    expect(screen.getByText('7 ilan')).toBeOnTheScreen();
    expect(screen.getByText('Diecast meraklısı')).toBeOnTheScreen();
    expect(screen.queryByText('Henüz kimseyi takip etmiyorsunuz')).toBeNull();

    // Satıcı kimliği takip kaydının id'si değil, `following.id`.
    fireEvent.press(screen.getByTestId('following-seller-seller-1'));
    expect(pushMock).toHaveBeenCalledWith('/seller/seller-1');
  });

  it('istek hata verirse boş durum yerine hata + yeniden dene görünür', async () => {
    mockGet.mockRejectedValue(new Error('500'));
    renderWithProviders(<FollowingScreen />);

    await waitFor(() => expect(screen.getByText('Takip listesi yüklenemedi')).toBeOnTheScreen());
    expect(screen.queryByText('Henüz kimseyi takip etmiyorsunuz')).toBeNull();
  });
});
