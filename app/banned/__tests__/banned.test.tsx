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

// Görüntüsüz soğuk açılış (ertelenmiş oturum): arayüz misafir ama saklı token var.
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (state: { isAuthenticated: boolean; logout: () => void }) => unknown) => {
    const state = { isAuthenticated: false, logout: jest.fn() };
    return sel ? sel(state) : state;
  },
}));

let mockStoredToken: string | null = 'token-1';
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (k: string) => (k === 'accessToken' ? mockStoredToken : null)),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const mockGetProfile = jest.fn();
jest.mock('@/lib/api', () => ({
  userApi: { getProfile: (...args: unknown[]) => mockGetProfile(...args) },
  resetBannedRedirect: jest.fn(),
}));

import { SESSION_PROBE } from '@/lib/api/sessionState';
import BannedScreen from '../index';

const PHISH = 'Hesabınızı açmak için 0850 000 00 00 arayın';
const banError = (bannedReason: unknown) =>
  Object.assign(new Error('403'), {
    response: { status: 403, data: { errorCode: 'USER_BANNED', bannedReason } },
  });

beforeEach(() => {
  resetRouterMocks();
  mockGetProfile.mockReset();
  mockStoredToken = 'token-1';
});

describe('BannedScreen', () => {
  it('nedeni sunucudan gösterir (saklı token yeter, isAuthenticated beklenmez); URL metnini göstermez', async () => {
    mockGetProfile.mockRejectedValue(banError('Sahte ilan'));
    renderWithProviders(<BannedScreen />);
    expect(await screen.findByText('Sahte ilan')).toBeOnTheScreen();
    expect(screen.queryByText(PHISH)).toBeNull();
    // Ertelenmiş oturumda da Bearer taşısın diye oturum yoklaması olarak gider.
    expect(mockGetProfile).toHaveBeenCalledWith(SESSION_PROBE);
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

  it('saklı token yoksa istek atılmaz, yönlendirme yok, parametre metni yine gösterilmez', async () => {
    mockStoredToken = null;
    renderWithProviders(<BannedScreen />);
    await new Promise((r) => setTimeout(r, 0));
    expect(mockGetProfile).not.toHaveBeenCalled();
    expect(dismissToMock).not.toHaveBeenCalled();
    expect(screen.queryByText(PHISH)).toBeNull();
  });
});
