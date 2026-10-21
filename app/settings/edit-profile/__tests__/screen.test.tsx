/**
 * Profili düzenle — iOS Ayarlar düzeni:
 *  - Üyelik rozet kartı yok; Hesap kartında kullanıcı adı / e-posta SALT OKUNUR satırlar
 *    (e-posta → kendi ekranı; kullanıcı adı yalnız belirlenebilir hesapta → kendi ekranı).
 *  - Alt çubuk "Değişiklikleri Kaydet" yalnız form kirliyken etkin; kayıttan sonra yine pasif.
 *  - Kirli formdan çıkış onay ister (`useUnsavedChangesGuard`), temiz formdan istemez.
 *  - Fotoğraf seçilince ANINDA yüklenir + PATCH /users/me (web `useUploadAvatar` paritesi).
 */
import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils/render';
import { appAlert, ToastHost } from '@/ui';
import { emitBeforeRemove, pushMock, resetRouterMocks } from '@/test-utils/router-mock';

jest.mock('expo-router', () => require('@/test-utils/router-mock').routerMock);

let mockUser: any;
const mockRefreshUserData = jest.fn((): Promise<any> => Promise.resolve(null));
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (state: any) => unknown) => {
    const state: any = {
      user: mockUser,
      isAuthenticated: true,
      // Tam profil bu oturumda geldi (kapı `profileFullLoad.test.tsx`'te).
      profileValidated: true,
      updateUser: jest.fn(),
      refreshUserData: mockRefreshUserData,
    };
    return sel ? sel(state) : state;
  },
}));

jest.mock('@/lib/api', () => ({
  userApi: {
    updateProfile: jest.fn(() => Promise.resolve({ data: {} })),
    claimUsername: jest.fn(),
    getProfile: jest.fn(() => Promise.resolve({ data: {} })),
  },
  mediaApi: { uploadAvatar: jest.fn(() => Promise.resolve({ data: { key: 'avatars/u1/yeni.jpg' } })) },
  authApi: {
    checkUsernameAvailability: jest.fn(),
    requestEmailChange: jest.fn(),
    verifyEmailChange: jest.fn(),
  },
  errorText: jest.requireActual('@/lib/api/errorText').errorText,
}));
import { mediaApi, userApi } from '@/lib/api';

jest.mock('expo-image-picker', () => ({
  MediaTypeOptions: { Images: 'Images' },
  launchImageLibraryAsync: jest.fn(() =>
    Promise.resolve({ canceled: false, assets: [{ uri: 'file:///yeni-foto.jpg' }] }),
  ),
}));

import EditProfileScreen from '../index';

const updateProfile = userApi.updateProfile as jest.Mock;
const uploadAvatar = mediaApi.uploadAvatar as jest.Mock;

const baseUser = {
  id: 'u1',
  displayName: 'Test Kullanıcı',
  email: 't@b.com',
  isEmailVerified: true,
  membershipTier: 'free',
  username: 'kaan.merakli',
  usernameClaimed: true,
  avatar: 'https://cdn.example.com/a.jpg?sig=1',
};

const renderScreen = () =>
  renderWithProviders(
    <>
      <EditProfileScreen />
      <ToastHost />
    </>,
  );

const isDisabled = (testID: string) =>
  !!screen.getByTestId(testID).props.accessibilityState?.disabled;

beforeEach(() => {
  jest.clearAllMocks();
  resetRouterMocks();
  mockUser = { ...baseUser };
});

describe('Profili düzenle · güven skoru anahtarı kaldırıldı', () => {
  it('görünürlük anahtarı çizilmez, ekran /users/me\'yi ikinci kez çekmez ve showTrustScore göndermez', () => {
    renderScreen();
    expect(screen.queryByTestId('edit-profile-trust-section')).toBeNull();
    expect(screen.queryByTestId('edit-profile-trust-visibility')).toBeNull();
    expect(screen.queryByText('Güven skorumu herkese göster')).toBeNull();
    expect(userApi.getProfile).not.toHaveBeenCalled();
    expect(updateProfile).not.toHaveBeenCalled();
  });
});

describe('Profili düzenle · düzen', () => {
  it('üyelik rozet kartı yok; Hesap satırları + Kişisel Bilgiler; temizken Kaydet yok', () => {
    renderScreen();
    expect(screen.queryByText('Ücretsiz Üye')).toBeNull();
    expect(screen.getByTestId('edit-profile-account-section')).toBeTruthy();
    expect(screen.getByText('@kaan.merakli')).toBeTruthy();
    expect(screen.getByText('Kullanıcı adı değiştirilemez')).toBeTruthy();
    expect(screen.getByText('t@b.com')).toBeTruthy();
    expect(screen.getByText('Doğrulandı')).toBeTruthy();
    expect(screen.getByText('Kişisel Bilgiler')).toBeTruthy();
    expect(screen.queryByText('Değişiklikleri Kaydet')).toBeNull();
    // Satır içi formlar bu ekranda yok (kendi ekranlarında).
    expect(screen.queryByTestId('email-change-input')).toBeNull();
    expect(screen.queryByTestId('username-input')).toBeNull();
  });

  it('e-posta satırı e-posta değiştirme ekranına gider', () => {
    renderScreen();
    fireEvent.press(screen.getByTestId('edit-profile-email-row'));
    expect(pushMock).toHaveBeenCalledWith('/settings/edit-profile/email');
  });

  it('belirlenmiş kullanıcı adı salt okunur satır: dokunulmaz, ekran açılmaz', () => {
    renderScreen();
    expect(screen.queryByTestId('edit-profile-username-row')).toBeNull();
    fireEvent.press(screen.getByTestId('username-claimed'));
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('belirlenebilir hesapta kullanıcı adı satırı kendi ekranına gider', () => {
    mockUser = { ...baseUser, username: 'otomatik.ad', usernameClaimed: false };
    renderScreen();
    expect(screen.getByText('@otomatik.ad')).toBeTruthy();
    fireEvent.press(screen.getByTestId('edit-profile-username-row'));
    expect(pushMock).toHaveBeenCalledWith('/settings/edit-profile/username');
  });
});

describe('Profili düzenle · kaydet + çıkış koruması', () => {
  const nameInput = () => screen.getByDisplayValue('Test Kullanıcı');

  it('form temizken Kaydet gizli, çıkış korumasız', () => {
    renderScreen();
    expect(screen.queryByTestId('edit-profile-save')).toBeNull();
    expect(emitBeforeRemove().prevented).toBe(false);
    expect(appAlert).not.toHaveBeenCalled();
  });

  it('düzenleyince Kaydet etkin; kirliyken çıkış onay ister', async () => {
    renderScreen();
    fireEvent.changeText(nameInput(), 'Yeni Ad');
    await waitFor(() => expect(isDisabled('edit-profile-save')).toBe(false));
    expect(emitBeforeRemove().prevented).toBe(true);
    await waitFor(() => expect(appAlert).toHaveBeenCalledTimes(1));
    expect((appAlert as jest.Mock).mock.calls[0]![0]).toBe('Kaydedilmemiş değişiklikler');
  });

  it('kayıt yalnız profil alanlarını gönderir; başarıdan sonra form temiz (Kaydet gizli, çıkış serbest)', async () => {
    renderScreen();
    fireEvent.changeText(nameInput(), 'Yeni Ad');
    await waitFor(() => expect(isDisabled('edit-profile-save')).toBe(false));
    fireEvent.press(screen.getByTestId('edit-profile-save'));

    await waitFor(() => expect(updateProfile).toHaveBeenCalledTimes(1));
    const payload = updateProfile.mock.calls[0]![0];
    expect(payload.displayName).toBe('Yeni Ad');
    expect(payload).not.toHaveProperty('avatarUrl');
    expect(await screen.findByText('Profil güncellendi!')).toBeTruthy();
    await waitFor(() => expect(screen.queryByTestId('edit-profile-save')).toBeNull());
    expect(emitBeforeRemove().prevented).toBe(false);
  });
});

describe('Profili düzenle · fotoğraf anında yüklenir', () => {
  it('seçim → yükleme → PATCH { avatarUrl } → store tazelenir + toast; Kaydet gerekmez', async () => {
    renderScreen();
    await act(async () => {
      fireEvent.press(screen.getByTestId('edit-profile-avatar'));
    });

    await waitFor(() =>
      expect(uploadAvatar).toHaveBeenCalledWith({
        uri: 'file:///yeni-foto.jpg',
        name: 'avatar.jpg',
        type: 'image/jpeg',
      }),
    );
    await waitFor(() => expect(updateProfile).toHaveBeenCalledWith({ avatarUrl: 'avatars/u1/yeni.jpg' }));
    await waitFor(() => expect(mockRefreshUserData).toHaveBeenCalled());
    expect(await screen.findByText('Profil fotoğrafı güncellendi')).toBeTruthy();
    // Profil formu kirlenmedi: Kaydet hâlâ gizli.
    expect(screen.queryByTestId('edit-profile-save')).toBeNull();
  });

  it('yükleme düşerse hata toast + önizleme geri alınır', async () => {
    uploadAvatar.mockRejectedValueOnce(new Error('network'));
    renderScreen();
    await act(async () => {
      fireEvent.press(screen.getByTestId('edit-profile-avatar'));
    });
    expect(await screen.findByText('Fotoğraf yüklenemedi')).toBeTruthy();
    expect(updateProfile).not.toHaveBeenCalled();
    const json = JSON.stringify(screen.toJSON());
    expect(json).not.toContain('yeni-foto.jpg');
  });
});
