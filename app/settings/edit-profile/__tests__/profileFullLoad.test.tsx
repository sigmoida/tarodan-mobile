/**
 * Profili düzenle — form TAM profille açılır.
 *
 * Soğuk açılışta store kullanıcısı saklı görüntüden gelir (telefon / doğum tarihi / bio / vergi
 * dairesi yok — `@/stores/userSnapshot`); giriş yanıtı da bu alanları taşımaz. Form bu kullanıcıyla
 * tohumlanınca alanlar boş görünüyor, kayıt da yanlış temelle gidiyordu ("telefon silindi").
 * Sözleşme (`useFullProfile`):
 * - `profileValidated` yoksa `refreshUserData()` çekilir, bu sırada form GÖSTERİLMEZ;
 * - profil gelince form temeli bir kez ondan kurulur (RHF `reset`) — form temiz kalır;
 * - çekim düşerse hata durumu + "Tekrar dene".
 */
import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils/render';
import { resetRouterMocks } from '@/test-utils/router-mock';

jest.mock('expo-router', () => jest.requireActual('@/test-utils/router-mock').routerMock);

const mockRefreshUserData = jest.fn();
jest.mock('@/stores/authStore', () => {
  const { create } = jest.requireActual('zustand');
  return {
    useAuthStore: create(() => ({
      user: null,
      isAuthenticated: true,
      profileValidated: false,
      updateUser: jest.fn(),
      refreshUserData: () => mockRefreshUserData(),
    })),
  };
});

jest.mock('@/lib/api', () => ({
  userApi: {
    updateProfile: jest.fn(() => Promise.resolve({ data: {} })),
    getProfile: jest.fn(() => Promise.resolve({ data: { isPremium: false, trustScore: null } })),
  },
  mediaApi: { uploadAvatar: jest.fn() },
  authApi: { checkUsernameAvailability: jest.fn(), requestEmailChange: jest.fn(), verifyEmailChange: jest.fn() },
  errorText: jest.requireActual('@/lib/api/errorText').errorText,
}));

import { useAuthStore, type User } from '@/stores/authStore';
import EditProfileScreen from '../index';

/** Saklı görüntü: kimlik + üyelik; telefon / bio / doğum tarihi YOK. */
const snapshotUser = {
  id: 'u1',
  displayName: 'Test Kullanıcı',
  email: 't@b.com',
  isEmailVerified: true,
  membershipTier: 'free',
  username: 'kaan.merakli',
  usernameClaimed: true,
} as unknown as User;
const fullUser: User = {
  ...snapshotUser,
  phone: '+905321112233',
  bio: 'Diecast meraklısı',
  birthDate: '1990-01-31',
};

/** `refreshUserData`'nın gerçek davranışı: başarıda kullanıcı + bayrak yazılır. */
const resolvesFullProfile = () => {
  useAuthStore.setState({ user: fullUser, profileValidated: true });
  return Promise.resolve(fullUser);
};

beforeEach(() => {
  jest.clearAllMocks();
  resetRouterMocks();
  useAuthStore.setState({ user: snapshotUser, isAuthenticated: true, profileValidated: false });
});

it('profil gelene kadar form yok; gelince alanlar tam profilden dolar, form temiz', async () => {
  let release!: () => void;
  mockRefreshUserData.mockImplementationOnce(
    () => new Promise((resolve) => (release = () => resolve(resolvesFullProfile()))),
  );

  renderWithProviders(<EditProfileScreen />);

  await waitFor(() => expect(mockRefreshUserData).toHaveBeenCalledTimes(1));
  // Eksik görüntüyle form açılmaz (boş bio / telefon gösterilmez).
  expect(screen.queryByDisplayValue('Test Kullanıcı')).toBeNull();
  expect(screen.queryByTestId('profile-phone-input')).toBeNull();

  await act(async () => release());

  expect(await screen.findByDisplayValue('Diecast meraklısı')).toBeTruthy();
  expect(screen.getByDisplayValue('Test Kullanıcı')).toBeTruthy();
  expect(String(screen.getByTestId('profile-phone-input').props.value).replace(/\D/g, '')).toBe(
    '5321112233',
  );
  // Temel profilden kuruldu: kaydedilecek değişiklik yok.
  expect(screen.queryByTestId('edit-profile-save')).toBeNull();
});

it('profil bu oturumda zaten doğrulandıysa yeniden çekilmez', async () => {
  useAuthStore.setState({ user: fullUser, profileValidated: true });

  renderWithProviders(<EditProfileScreen />);

  expect(await screen.findByDisplayValue('Diecast meraklısı')).toBeTruthy();
  expect(mockRefreshUserData).not.toHaveBeenCalled();
});

it('çekim düşerse hata + tekrar dene; başarıda form açılır', async () => {
  mockRefreshUserData.mockResolvedValue(null);

  renderWithProviders(<EditProfileScreen />);

  expect(await screen.findByTestId('error-state', {}, { timeout: 5000 })).toBeTruthy();
  expect(screen.queryByTestId('profile-phone-input')).toBeNull();

  mockRefreshUserData.mockImplementation(resolvesFullProfile);
  fireEvent.press(screen.getByText('Tekrar Dene'));

  expect(await screen.findByDisplayValue('Diecast meraklısı')).toBeTruthy();
});
