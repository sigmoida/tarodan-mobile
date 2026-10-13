/**
 * Profili düzenle — tek ekran: üç bölüm (kişisel bilgiler / kullanıcı adı / e-posta),
 * alt çubuk "Kaydet" yalnız profil bilgisini kaydeder; eski ayrı ekran düğmeleri
 * (AccountLinks) ve "destek ile iletişime geçin" yardım metni yok.
 * Ayrıca avatar tuzağı: kaydedilmemiş yerel fotoğraf, store yenilenince (e-posta /
 * kullanıcı adı akışları `user` nesnesini değiştirir) sessizce geri dönmemeli.
 */
import React from 'react';
import { screen } from '@testing-library/react-native';
import { renderHook, act } from '@testing-library/react-native';
import { renderWithProviders, makeTestQueryClient } from '@/test-utils/render';
import { QueryClientProvider } from '@tanstack/react-query';

jest.mock('expo-router', () => require('@/test-utils/router-mock').routerMock);

let mockUser: any;
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (state: any) => unknown) => {
    const state: any = {
      user: mockUser,
      isAuthenticated: true,
      updateUser: jest.fn(),
      refreshUserData: jest.fn(() => Promise.resolve(null)),
    };
    return sel ? sel(state) : state;
  },
}));

jest.mock('@/lib/api', () => ({
  userApi: { updateProfile: jest.fn(), claimUsername: jest.fn() },
  mediaApi: { uploadAvatar: jest.fn() },
  authApi: {
    checkUsernameAvailability: jest.fn(),
    requestEmailChange: jest.fn(),
    verifyEmailChange: jest.fn(),
  },
  errorText: jest.requireActual('@/lib/api/errorText').errorText,
}));

jest.mock('expo-image-picker', () => ({
  MediaTypeOptions: { Images: 'Images' },
  launchImageLibraryAsync: jest.fn(() =>
    Promise.resolve({ canceled: false, assets: [{ uri: 'file:///yeni-foto.jpg' }] }),
  ),
}));

import EditProfileScreen from '../index';
import { useEditProfile } from '../_hooks/useEditProfile';

const baseUser = {
  displayName: 'Test Kullanıcı',
  email: 't@b.com',
  isEmailVerified: true,
  membershipTier: 'free',
  username: 'kaan.merakli',
  usernameClaimed: true,
  avatar: 'https://cdn.example.com/a.jpg?sig=1',
};

describe('Profili düzenle · tek ekran', () => {
  beforeEach(() => {
    mockUser = { ...baseUser };
  });

  it('üç bölüm + alt çubuk Kaydet; ayrı ekran düğmeleri ve destek yardım metni yok', () => {
    renderWithProviders(<EditProfileScreen />);

    expect(screen.getByText('Kişisel Bilgiler')).toBeTruthy();
    expect(screen.getByTestId('edit-profile-username-section')).toBeTruthy();
    expect(screen.getByTestId('edit-profile-email-section')).toBeTruthy();
    expect(screen.getByText('@kaan.merakli')).toBeTruthy();
    expect(screen.getByText('t@b.com')).toBeTruthy();
    expect(screen.getByText('Değiştir')).toBeTruthy();
    expect(screen.getByText('Değişiklikleri Kaydet')).toBeTruthy();

    // Eski AccountLinks düğmeleri ve yanıltıcı yardım metni kalktı.
    expect(screen.queryByTestId('edit-profile-email-change')).toBeNull();
    expect(screen.queryByTestId('edit-profile-username')).toBeNull();
    expect(screen.queryByText(/destek ile iletişime/)).toBeNull();
  });

  it('belirlenmiş kullanıcı adı salt okunur: alan ve Kaydet yok', () => {
    renderWithProviders(<EditProfileScreen />);
    expect(screen.queryByTestId('username-input')).toBeNull();
    expect(screen.queryByTestId('username-submit')).toBeNull();
  });

  it('belirlenebilir hesapta kullanıcı adı formu aynı ekranda açılır', () => {
    mockUser = { ...baseUser, username: 'otomatik.ad', usernameClaimed: false };
    renderWithProviders(<EditProfileScreen />);
    expect(screen.getByTestId('username-input')).toBeTruthy();
    expect(screen.getByTestId('username-submit')).toBeTruthy();
  });
});

describe('useEditProfile · avatar', () => {
  const setup = () => {
    const client = makeTestQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    return renderHook(() => useEditProfile(), { wrapper });
  };

  beforeEach(() => {
    mockUser = { ...baseUser };
  });

  it('sunucudaki avatar ilk değer olarak alınır', () => {
    const { result } = setup();
    expect(result.current.avatar).toBe(baseUser.avatar);
  });

  it('kaydedilmemiş yerel seçim, `user` nesnesi yenilenince (aynı avatar) bozulmaz', async () => {
    const { result, rerender } = setup();
    await act(async () => {
      await result.current.pickAvatar();
    });
    expect(result.current.avatar).toBe('file:///yeni-foto.jpg');

    mockUser = { ...baseUser, email: 'yeni@b.com' }; // e-posta doğrulandı → yeni user nesnesi
    rerender({});
    expect(result.current.avatar).toBe('file:///yeni-foto.jpg');
  });

  it('presigned URL değişse bile (yeni imza) yerel seçim korunur', async () => {
    const { result, rerender } = setup();
    await act(async () => {
      await result.current.pickAvatar();
    });

    mockUser = { ...baseUser, avatar: 'https://cdn.example.com/a.jpg?sig=2' };
    rerender({});
    expect(result.current.avatar).toBe('file:///yeni-foto.jpg');
  });

  it('yerel seçim yokken sunucu avatarı değişirse eşlenir', () => {
    const { result, rerender } = setup();
    mockUser = { ...baseUser, avatar: 'https://cdn.example.com/b.jpg' };
    rerender({});
    expect(result.current.avatar).toBe('https://cdn.example.com/b.jpg');
  });
});
