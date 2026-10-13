/**
 * B4 · Auth ekranlarının en üstündeki yönetimden gelen görsel (web
 * `AuthHeroFrame`, delta 24 P2). Web'deki gibi:
 *   - kayıt yolları (`/register`, `/register/business`) → `auth_register`
 *   - giriş ve kurumsal davet → `auth_default`
 *   - şifre unuttum / sıfırla / e-posta doğrula → görsel YOK (web `(minimal)`
 *     çerçevesi: "No two-panel hero").
 * Slayt yoksa hiçbir şey çizilmez. Web paneli `hidden lg:flex`: telefonda
 * (< 1024pt) görsel YOK, yalnız geniş pencerede (iPad yatay).
 */
import React from 'react';
import { act, screen, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';

jest.mock('expo-router', () => ({
  ...require('@/test-utils/router-mock').routerMock,
  useLocalSearchParams: () => ({ token: 'inv-1' }),
}));

const mockGetSlides = jest.fn();
jest.mock('@/lib/api', () => ({
  heroApi: { getSlides: (...a: unknown[]) => mockGetSlides(...a) },
  authApi: {
    login: jest.fn(),
    getProfile: jest.fn(),
    resendVerification: jest.fn(),
    register: jest.fn(),
    registerBusiness: jest.fn(),
    checkUsernameAvailability: jest.fn(() => Promise.resolve({ data: { available: true } })),
    forgotPassword: jest.fn(),
    getCorporateInvitation: jest.fn(() =>
      Promise.resolve({ data: { companyTitle: 'Tarodan Otomotiv', companyEmail: 'k@firma.com' } }),
    ),
    activateCorporateInvitation: jest.fn(),
  },
  errorText: jest.requireActual('@/lib/api/errorText').errorText,
}));

jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (state: any) => unknown) => {
    const state: any = { login: jest.fn() };
    return sel ? sel(state) : state;
  },
}));

/** Pencere genişliği: varsayılan iPad yatay (görsel yalnız ≥ 1024pt — web `lg`). */
let mockWindowWidth = 1366;
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: mockWindowWidth, height: 1024, scale: 2, fontScale: 1 }),
}));

import LoginScreen from '../login';
import RegisterScreen from '../register';
import RegisterBusinessScreen from '../register-business';
import CorporateInviteScreen from '../corporate-invite';
import ForgotPasswordScreen from '../forgot-password';

const TITLES = { auth_default: 'Koleksiyonuna hoş geldin', auth_register: 'Aramıza katıl' } as const;

function slideFor(placement: keyof typeof TITLES) {
  return {
    id: `s-${placement}`,
    placement,
    imageUrl: 'https://cdn.example/desk.jpg',
    mobileImageUrl: 'https://cdn.example/mobile.jpg',
    imageSide: 'right',
    title: { tr: TITLES[placement], en: TITLES[placement] },
    subtitle: null,
    imageAlt: null,
    cta1: null,
    cta2: null,
    hideOnIos: false,
  };
}

beforeEach(() => {
  mockWindowWidth = 1366;
  mockGetSlides.mockReset();
  mockGetSlides.mockImplementation((placement: keyof typeof TITLES) =>
    Promise.resolve({ data: [slideFor(placement)] }),
  );
});

it.each([
  ['giriş', 'auth_default', LoginScreen],
  ['kurumsal davet', 'auth_default', CorporateInviteScreen],
  ['kayıt', 'auth_register', RegisterScreen],
  ['kurumsal kayıt', 'auth_register', RegisterBusinessScreen],
] as const)('geniş pencere: %s ekranı en üstte %s görselini gösterir', async (_name, placement, Screen) => {
  renderWithProviders(<Screen />);
  expect(await screen.findByText(TITLES[placement])).toBeOnTheScreen();
  expect(screen.getByTestId('auth-hero')).toBeOnTheScreen();
  expect(mockGetSlides).toHaveBeenCalledWith(placement);
});

it('slayt yoksa görsel alanı hiç çizilmez', async () => {
  mockGetSlides.mockResolvedValue({ data: [] });
  renderWithProviders(<LoginScreen />);
  await waitFor(() => expect(mockGetSlides).toHaveBeenCalledWith('auth_default'));
  await act(async () => {}); // sorgu sonucunun render'ı
  expect(screen.queryByTestId('auth-hero')).toBeNull();
  expect(screen.getByTestId('login-continue-button')).toBeOnTheScreen();
});

it('şifre unuttum ekranında görsel yok (web minimal çerçeve)', () => {
  renderWithProviders(<ForgotPasswordScreen />);
  expect(mockGetSlides).not.toHaveBeenCalled();
  expect(screen.queryByTestId('auth-hero')).toBeNull();
});

it.each([
  ['giriş', LoginScreen],
  ['kurumsal davet', CorporateInviteScreen],
  ['kayıt', RegisterScreen],
  ['kurumsal kayıt', RegisterBusinessScreen],
] as const)('telefonda (390pt) %s ekranında görsel yok, slayt istenmez (web gibi)', async (_name, Screen) => {
  mockWindowWidth = 390;
  renderWithProviders(<Screen />);
  await act(async () => {});
  expect(screen.queryByTestId('auth-hero')).toBeNull();
  expect(mockGetSlides).not.toHaveBeenCalled();
});
