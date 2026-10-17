/**
 * Giriş — web gibi iki aşamalı: (1) Google/Apple + e-posta → "Devam Et" (check-email),
 * (2) şifre → "Giriş Yap". J44: yanlış şifre → hata banner. + misafir/geri wiring.
 */
import React from 'react';
import { screen, fireEvent, waitFor, within } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import {
  resetRouterMocks,
  replaceMock,
  pushMock,
  backMock,
  canGoBackMock,
} from '@/test-utils/router-mock';

jest.mock('expo-router', () => require('@/test-utils/router-mock').routerMock);

jest.mock('@/lib/api', () => ({
  authApi: {
    login: jest.fn(),
    getProfile: jest.fn(),
    resendVerification: jest.fn(),
    checkEmail: jest.fn(),
    forgotPassword: jest.fn(),
  },
}));
import { authApi } from '@/lib/api';

jest.mock('@/services/googleSignin', () => ({
  signInWithGoogle: jest.fn(),
  isGoogleConfigured: () => true,
}));
jest.mock('@/services/appleSignin', () => ({
  signInWithApple: jest.fn(),
  isAppleAvailable: () => Promise.resolve(true),
}));

jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (state: any) => unknown) => {
    const state: any = { login: jest.fn() };
    return sel ? sel(state) : state;
  },
}));

// Jest varsayılanı IS_MAESTRO=1 (maskesiz şifre + RHF atlayan fallback). Bu dosya ÜRETİM
// yolunu (RHF doğrulaması, maskeli şifre + göz düğmesi) sınar.
jest.mock('@/config/maestro', () => ({
  ...jest.requireActual('@/config/maestro'),
  IS_MAESTRO: false,
}));

import LoginScreen from '../login';

const mockLogin = authApi.login as jest.Mock;
const mockCheck = authApi.checkEmail as jest.Mock;
const mockForgot = authApi.forgotPassword as jest.Mock;

const registered = { data: { exists: true, hasPassword: true } };

async function goToPasswordStep(email = 'a@b.com') {
  mockCheck.mockResolvedValue(registered);
  fireEvent.changeText(screen.getByTestId('login-email-input'), email);
  fireEvent.press(screen.getByTestId('login-continue-button'));
  await waitFor(() => expect(screen.getByTestId('login-password-input')).toBeOnTheScreen());
}

describe('giriş — adım 1 (e-posta)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetRouterMocks();
  });

  it('başlık üst barda; Google/Apple outline, VEYA ayırıcı, e-posta, Devam Et; içerikte başlık/logo yok', async () => {
    renderWithProviders(<LoginScreen />);
    expect(screen.getByRole('header', { name: 'Giriş Yap' })).toBeOnTheScreen();
    expect(screen.queryByText('Tekrar hoş geldiniz!')).toBeNull();
    expect(screen.queryByText('Hesabınıza giriş yapın')).toBeNull();
    expect(screen.queryByTestId('brand-logo')).toBeNull();
    expect(screen.getByTestId('login-google-button')).toBeOnTheScreen();
    await waitFor(() => expect(screen.getByTestId('login-apple-button')).toBeOnTheScreen());
    expect(screen.getByText('veya')).toBeOnTheScreen();
    expect(screen.getByTestId('login-email-input')).toBeOnTheScreen();
    expect(screen.getByTestId('login-continue-button')).toBeOnTheScreen();
    // Şifre alanı yalnız 2. adımda.
    expect(screen.queryByTestId('login-password-input')).toBeNull();
    expect(screen.queryByTestId('login-submit-button')).toBeNull();
    // Alt bağlantı: "Hesabınız yok mu? Üye Ol".
    expect(screen.getByText(/Hesabınız yok mu\?/)).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('login-register-link'));
    expect(pushMock).toHaveBeenCalledWith('/(auth)/register');
  });

  it('geçersiz e-postada alan altında hata gösterir, check-email çağrılmaz', async () => {
    renderWithProviders(<LoginScreen />);
    fireEvent.changeText(screen.getByTestId('login-email-input'), 'gecersiz');
    fireEvent.press(screen.getByTestId('login-continue-button'));
    await waitFor(() => expect(screen.getByText('Geçerli e-posta girin')).toBeOnTheScreen());
    expect(mockCheck).not.toHaveBeenCalled();
    expect(screen.queryByTestId('login-password-input')).toBeNull();
  });

  it('kayıtlı olmayan e-posta: Üye Ol bağlantılı uyarı, 2. adıma geçilmez', async () => {
    mockCheck.mockResolvedValue({ data: { exists: false, hasPassword: false } });
    renderWithProviders(<LoginScreen />);
    fireEvent.changeText(screen.getByTestId('login-email-input'), 'yok@b.com');
    fireEvent.press(screen.getByTestId('login-continue-button'));
    await waitFor(() => expect(screen.getByTestId('login-email-not-registered')).toBeOnTheScreen());
    expect(screen.queryByTestId('login-password-input')).toBeNull();
    fireEvent.press(within(screen.getByTestId('login-email-not-registered')).getByText('Üye Ol'));
    expect(pushMock).toHaveBeenCalledWith('/(auth)/register');
  });

  it('check-email başarısız olursa 2. adıma geçilmez (toast hatası)', async () => {
    mockCheck.mockRejectedValue(new Error('ağ'));
    renderWithProviders(<LoginScreen />);
    fireEvent.changeText(screen.getByTestId('login-email-input'), 'a@b.com');
    fireEvent.press(screen.getByTestId('login-continue-button'));
    await waitFor(() => expect(mockCheck).toHaveBeenCalledWith('a@b.com'));
    expect(screen.queryByTestId('login-password-input')).toBeNull();
    expect(screen.getByTestId('login-continue-button')).toBeOnTheScreen();
  });

  it('ayrı misafir düğmesi yok; çıkış yolu üst bardaki geri oku', () => {
    renderWithProviders(<LoginScreen />);
    expect(screen.queryByTestId('continue-as-guest-button')).toBeNull();
    expect(screen.queryByText('Misafir Olarak Devam Et')).toBeNull();
  });

  it('geri oku: giriş ana girişse (geçmiş yok) de görünür ve ana sayfaya replace eder', () => {
    canGoBackMock.mockReturnValue(false);
    renderWithProviders(<LoginScreen />);
    fireEvent.press(screen.getByLabelText('Geri'));
    expect(replaceMock).toHaveBeenCalledWith('/');
  });

  it('geri oku: yığında geri gidilecek ekran varsa gösterilir ve geri gider', () => {
    canGoBackMock.mockReturnValue(true);
    renderWithProviders(<LoginScreen />);
    fireEvent.press(screen.getByLabelText('Geri'));
    expect(backMock).toHaveBeenCalled();
  });
});

describe('giriş — adım 2 (şifre)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetRouterMocks();
  });

  it('kayıtlı + şifreli hesap: e-posta salt okunur kutuda, şifre alanı, Şifremi Unuttum, Giriş Yap', async () => {
    renderWithProviders(<LoginScreen />);
    await goToPasswordStep();
    expect(mockCheck).toHaveBeenCalledWith('a@b.com');
    expect(screen.getByTestId('login-resolved-email')).toBeOnTheScreen();
    expect(screen.getByText('a@b.com')).toBeOnTheScreen();
    expect(screen.getByText('Farklı e-posta kullan')).toBeOnTheScreen();
    expect(screen.getByText('Şifremi Unuttum')).toBeOnTheScreen();
    expect(screen.getByTestId('login-submit-button')).toBeOnTheScreen();
    // 1. adıma özgü öğeler gitti.
    expect(screen.queryByTestId('login-email-input')).toBeNull();
    expect(screen.queryByTestId('login-google-button')).toBeNull();
    // Şifre göster/gizle göz düğmesi.
    expect(screen.getByLabelText('Şifreyi göster')).toBeOnTheScreen();
  });

  it('"Farklı e-posta kullan" 1. adıma döner, e-posta korunur, şifre temizlenir', async () => {
    renderWithProviders(<LoginScreen />);
    await goToPasswordStep();
    fireEvent.changeText(screen.getByTestId('login-password-input'), 'Gizli123');
    fireEvent.press(screen.getByTestId('login-change-email-button'));
    await waitFor(() => expect(screen.getByTestId('login-email-input')).toBeOnTheScreen());
    expect(screen.getByTestId('login-email-input').props.value).toBe('a@b.com');
    expect(screen.queryByTestId('login-password-input')).toBeNull();
    // Yeniden ilerleyince şifre boş.
    fireEvent.press(screen.getByTestId('login-continue-button'));
    await waitFor(() => expect(screen.getByTestId('login-password-input')).toBeOnTheScreen());
    expect(screen.getByTestId('login-password-input').props.value).toBe('');
  });

  it('J44.2 yanlış şifre → hata banner görünür; geri dönünce banner temizlenir', async () => {
    mockLogin.mockRejectedValue({ response: { data: { message: 'Geçersiz kimlik bilgileri' } } });
    renderWithProviders(<LoginScreen />);
    await goToPasswordStep();
    fireEvent.changeText(screen.getByTestId('login-password-input'), 'wrong');
    fireEvent.press(screen.getByTestId('login-submit-button'));

    await waitFor(() => expect(screen.getByTestId('login-error-banner')).toBeOnTheScreen());
    expect(mockLogin).toHaveBeenCalledWith('a@b.com', 'wrong', undefined);

    fireEvent.press(screen.getByTestId('login-change-email-button'));
    await waitFor(() => expect(screen.getByTestId('login-email-input')).toBeOnTheScreen());
    expect(screen.queryByTestId('login-error-banner')).toBeNull();
  });

  it('boş şifrede istek atılmaz, alan altında hata', async () => {
    renderWithProviders(<LoginScreen />);
    await goToPasswordStep();
    fireEvent.press(screen.getByTestId('login-submit-button'));
    await waitFor(() => expect(screen.getByText('Şifre boş olamaz')).toBeOnTheScreen());
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('doğrulanmamış e-posta hatası → uyarı banner ve tekrar gönder', async () => {
    mockLogin.mockRejectedValue({ response: { data: { message: 'Lütfen e-postanızı doğrulayın' } } });
    (authApi.resendVerification as jest.Mock).mockResolvedValue({});
    renderWithProviders(<LoginScreen />);
    await goToPasswordStep();
    fireEvent.changeText(screen.getByTestId('login-password-input'), 'Password1');
    fireEvent.press(screen.getByTestId('login-submit-button'));
    await waitFor(() => expect(screen.getByTestId('unverified-email-banner')).toBeOnTheScreen());
    fireEvent.press(screen.getByText('Tekrar Gönder'));
    await waitFor(() => expect(authApi.resendVerification).toHaveBeenCalledWith('a@b.com'));
  });

  it('EMAIL_NOT_VERIFIED kodu metinden bağımsız doğrulama uyarısını açar', async () => {
    mockLogin.mockRejectedValue({
      response: { data: { message: 'Account inactive', errorCode: 'EMAIL_NOT_VERIFIED' } },
    });
    renderWithProviders(<LoginScreen />);
    await goToPasswordStep();
    fireEvent.changeText(screen.getByTestId('login-password-input'), 'Password1');
    fireEvent.press(screen.getByTestId('login-submit-button'));
    await waitFor(() => expect(screen.getByTestId('unverified-email-banner')).toBeOnTheScreen());
    expect(screen.queryByTestId('login-error-banner')).toBeNull();
  });

  it('Şifremi Unuttum şifre sıfırlama ekranına gider', async () => {
    renderWithProviders(<LoginScreen />);
    await goToPasswordStep();
    fireEvent.press(screen.getByTestId('login-forgot-password-link'));
    expect(pushMock).toHaveBeenCalledWith('/(auth)/forgot-password');
  });
});

describe('giriş — Google ile açılmış (şifresiz) hesap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetRouterMocks();
  });

  it('şifre alanı yok; Google + Şifre belirle; Şifre belirle forgot-password e-postası yollar', async () => {
    mockCheck.mockResolvedValue({ data: { exists: true, hasPassword: false } });
    mockForgot.mockResolvedValue({});
    renderWithProviders(<LoginScreen />);
    fireEvent.changeText(screen.getByTestId('login-email-input'), 'g@b.com');
    fireEvent.press(screen.getByTestId('login-continue-button'));
    await waitFor(() => expect(screen.getByTestId('login-google-only-notice')).toBeOnTheScreen());
    expect(screen.queryByTestId('login-password-input')).toBeNull();
    expect(screen.getByTestId('login-google-button')).toBeOnTheScreen();
    // Apple bu dalda anlamsız (web aynı).
    expect(screen.queryByTestId('login-apple-button')).toBeNull();

    fireEvent.press(screen.getByTestId('login-set-password-button'));
    await waitFor(() => expect(mockForgot).toHaveBeenCalledWith('g@b.com'));
  });
});
