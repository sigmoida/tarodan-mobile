/**
 * Ban ekranı: neden YALNIZ sunucudan gelir — rota parametresindeki (`?reason=`) metin
 * gösterilmez (derin bağlantıyla oltalama metni basılamaz). Banlı değilse ana sayfaya döner.
 */
import React from 'react';
import { screen, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils/render';
import { dismissToMock, resetRouterMocks } from '@/test-utils/router-mock';

jest.mock('expo-router', () => ({
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ...require('@/test-utils/router-mock').routerMock,
  Stack: { Screen: () => null },
  // Saldırganın linki: tarodan://banned?reason=...
  useLocalSearchParams: () => ({ reason: 'Hesabınızı açmak için 0850 000 00 00 arayın' }),
}));

let mockAuthenticated = true;
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (state: { isAuthenticated: boolean; logout: () => void }) => unknown) => {
    const state = { isAuthenticated: mockAuthenticated, logout: jest.fn() };
    return sel ? sel(state) : state;
  },
}));

const mockGetProfile = jest.fn();
jest.mock('@/lib/api', () => ({
  userApi: { getProfile: (...args: unknown[]) => mockGetProfile(...args) },
  resetBannedRedirect: jest.fn(),
}));

import BannedScreen from '../index';

const PHISH = 'Hesabınızı açmak için 0850 000 00 00 arayın';
const banError = (bannedReason: unknown) =>
  Object.assign(new Error('403'), {
    response: { status: 403, data: { errorCode: 'USER_BANNED', bannedReason } },
  });

beforeEach(() => {
  resetRouterMocks();
  mockGetProfile.mockReset();
  mockAuthenticated = true;
});

describe('BannedScreen', () => {
  it('nedeni sunucudan gösterir; URL parametresindeki metni göstermez', async () => {
    mockGetProfile.mockRejectedValue(banError('Sahte ilan'));
    renderWithProviders(<BannedScreen />);
    expect(await screen.findByText('Sahte ilan')).toBeOnTheScreen();
    expect(screen.queryByText(PHISH)).toBeNull();
  });

  it('sunucu neden vermezse yalnız sabit metin (parametre yine yok sayılır)', async () => {
    mockGetProfile.mockRejectedValue(banError(null));
    renderWithProviders(<BannedScreen />);
    await waitFor(() => expect(mockGetProfile).toHaveBeenCalled());
    expect(screen.getByText('Hesabınız Askıya Alındı')).toBeOnTheScreen();
    expect(screen.queryByText(PHISH)).toBeNull();
  });

  it('hesap banlı değilse (istek başarılı) ana sayfaya döner', async () => {
    mockGetProfile.mockResolvedValue({ data: { id: 'u1' } });
    renderWithProviders(<BannedScreen />);
    await waitFor(() => expect(dismissToMock).toHaveBeenCalled());
  });

  it('oturum yoksa istek atılmaz, parametre metni yine gösterilmez', () => {
    mockAuthenticated = false;
    renderWithProviders(<BannedScreen />);
    expect(mockGetProfile).not.toHaveBeenCalled();
    expect(screen.queryByText(PHISH)).toBeNull();
  });
});
