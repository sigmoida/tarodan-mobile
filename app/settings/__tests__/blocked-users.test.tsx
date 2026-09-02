/**
 * Profil → Engellenen Kullanıcılar (Apple App Review Guideline 1.2).
 *
 * Engelleme uzun süre tek yönlü bir çıkmazdı: `POST /users/:id/block` vardı ama
 * mobilde engeli GÖREN ya da KALDIRAN hiçbir ekran yoktu. Bu test listenin
 * sunucudan geldiğini, boş durumun anlatıldığını ve "Engeli Kaldır"ın gerçekten
 * `DELETE /users/:id/block` çağırdığını korur.
 */
import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';

jest.mock('expo-router', () => ({
  ...require('@/test-utils/router-mock').routerMock,
  useFocusEffect: jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (state: any) => unknown) => {
    const state: any = { isAuthenticated: true, user: { id: 'me' } };
    return sel ? sel(state) : state;
  },
}));

jest.mock('@/lib/api', () => ({
  userApi: {
    getBlockedUsers: jest.fn(),
    block: jest.fn(),
    unblock: jest.fn().mockResolvedValue({ data: { success: true } }),
    getBlockStatus: jest.fn().mockResolvedValue({ data: { blocked: true } }),
  },
}));

import { userApi } from '@/lib/api';
import BlockedUsersScreen from '../blocked-users';

const getBlockedUsers = userApi.getBlockedUsers as jest.Mock;
const unblock = userApi.unblock as jest.Mock;

beforeEach(() => {
  getBlockedUsers.mockReset().mockResolvedValue({ data: [] });
  unblock.mockReset().mockResolvedValue({ data: { success: true } });
});

describe('engellenen kullanıcılar listesi', () => {
  it('engellenenleri listeler', async () => {
    getBlockedUsers.mockResolvedValue({
      data: [
        { id: 'u1', displayName: 'Ayşe', blockedAt: '2026-09-01T10:00:00.000Z' },
        { id: 'u2', displayName: 'Mehmet', blockedAt: '2026-09-02T10:00:00.000Z' },
      ],
    });
    renderWithProviders(<BlockedUsersScreen />);
    expect(await screen.findByText('Ayşe')).toBeTruthy();
    expect(screen.getByText('Mehmet')).toBeTruthy();
  });

  it('kimse engellenmemişse boş durum gösterir', async () => {
    renderWithProviders(<BlockedUsersScreen />);
    expect(await screen.findByText('profile.blockedPage.empty')).toBeTruthy();
  });

  it('"Engeli Kaldır" DELETE /users/:id/block çağırır', async () => {
    getBlockedUsers.mockResolvedValue({
      data: [{ id: 'u1', displayName: 'Ayşe', blockedAt: '2026-09-01T10:00:00.000Z' }],
    });
    renderWithProviders(<BlockedUsersScreen />);
    fireEvent.press(await screen.findByText('profile.unblock'));
    await waitFor(() => expect(unblock).toHaveBeenCalledWith('u1'));
  });
});
