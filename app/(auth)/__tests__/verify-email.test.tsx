/**
 * J45 · E-posta doğrulama: süresi geçmiş/geçersiz token → hata ekranı,
 * manuel kod doğrulama, başarı durumu navigasyonu.
 */
import React from 'react';
import { TextInput } from 'react-native';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';

const mockReplace = jest.fn();
const mockBack = jest.fn();
let mockParams: Record<string, unknown> = {};

jest.mock('expo-router', () => ({
  router: { replace: (...a: unknown[]) => mockReplace(...a), back: (...a: unknown[]) => mockBack(...a) },
  useLocalSearchParams: () => mockParams,
}));

let mockAuth: { isAuthenticated: boolean; user: { email?: string } | null } = {
  isAuthenticated: false,
  user: null,
};
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (state: any) => unknown) => {
    const state: any = mockAuth;
    return sel ? sel(state) : state;
  },
}));

jest.mock('@/lib/api', () => ({
  authApi: { verifyEmail: jest.fn(), resendVerification: jest.fn() },
}));
import { authApi } from '@/lib/api';
import { usePendingAuthEmailStore } from '@/stores/pendingAuthEmailStore';

import VerifyEmailScreen from '../verify-email';

const mockVerify = authApi.verifyEmail as jest.Mock;
const mockResend = authApi.resendVerification as jest.Mock;

describe('J45 · e-posta doğrulama (süresi geçmiş token)', () => {
  beforeEach(() => {
    mockVerify.mockReset();
    mockResend.mockReset();
    mockResend.mockResolvedValue({ data: {} });
    usePendingAuthEmailStore.setState({ email: null });
    mockReplace.mockClear();
    mockBack.mockClear();
    mockParams = {};
    mockAuth = { isAuthenticated: false, user: null };
  });

  it('J45.1 deep-link token süresi dolmuş → "Doğrulama Başarısız" + backend mesajı', async () => {
    mockParams = { token: 'expired-token' };
    mockVerify.mockRejectedValue({
      response: { data: { message: 'Doğrulama bağlantısının süresi dolmuş.' } },
    });
    renderWithProviders(<VerifyEmailScreen />);

    await waitFor(() => expect(screen.getByText('Doğrulama Başarısız')).toBeOnTheScreen());
    expect(screen.getByText('Doğrulama bağlantısının süresi dolmuş.')).toBeOnTheScreen();
    expect(mockVerify).toHaveBeenCalledWith('expired-token');
  });

  it('J45.2 geçerli token → başarı ekranı, misafir ise giriş ekranına yönlendirir', async () => {
    mockParams = { token: 'good-token' };
    mockVerify.mockResolvedValue({});
    renderWithProviders(<VerifyEmailScreen />);

    // Başlık artık katalogdaki `auth.emailVerified` — ekranın kendi kopyası
    // ("E-postanız doğrulandı") kaldırıldı, aynı cümlenin iki sürümü kalmasın.
    await waitFor(() => expect(screen.getByText('E-posta Doğrulandı!')).toBeOnTheScreen());
    fireEvent.press(screen.getByText('Giriş Yap'));
    expect(mockReplace).toHaveBeenCalledWith('/(auth)/login');
  });

  it('J45.3 token yokken idle: manuel kod boşken "Kodu Doğrula" disabled', () => {
    renderWithProviders(<VerifyEmailScreen />);
    expect(screen.getByText('Kodu Doğrula')).toBeDisabled();
  });

  it('J45.4 manuel kod girildi → verifyEmail trim edilmiş kod ile çağrılır', async () => {
    mockVerify.mockResolvedValue({});
    renderWithProviders(<VerifyEmailScreen />);
    fireEvent.changeText(screen.UNSAFE_getAllByType(TextInput)[0], '  abc123  ');
    fireEvent.press(screen.getByText('Kodu Doğrula'));

    await waitFor(() => expect(mockVerify).toHaveBeenCalledWith('abc123'));
  });

  it('J45.5 girişli kullanıcı + hata → "Yeni Bağlantı Gönder" butonu görünür', async () => {
    mockParams = { token: 'expired' };
    mockAuth = { isAuthenticated: true, user: { email: 'a@b.com' } };
    mockVerify.mockRejectedValue({ response: { data: { message: 'Süresi dolmuş.' } } });
    renderWithProviders(<VerifyEmailScreen />);

    await waitFor(() => expect(screen.getByText('Doğrulama Başarısız')).toBeOnTheScreen());
    expect(screen.getByText('Yeni Bağlantı Gönder')).toBeOnTheScreen();
  });
  it('J45.6 misafir + hata → e-posta alanı + "Yeni Bağlantı Gönder"; yazılan adrese resend-verification', async () => {
    mockParams = { token: 'used' };
    mockVerify.mockRejectedValue({ response: { data: { message: 'Bağlantı daha önce kullanılmış.' } } });
    renderWithProviders(<VerifyEmailScreen />);

    await waitFor(() => expect(screen.getByText('Doğrulama Başarısız')).toBeOnTheScreen());
    expect(screen.getByText('Bağlantı daha önce kullanılmış.')).toBeOnTheScreen();
    fireEvent.changeText(screen.getByTestId('resend-verification-email-input'), 'misafir@demo.com');
    fireEvent.press(screen.getByTestId('resend-verification-button'));

    await waitFor(() => expect(mockResend).toHaveBeenCalledWith('misafir@demo.com'));
    // Başarılı gönderimden sonra 60 sn geri sayım: tekrar basış kilitli.
    await waitFor(() => expect(screen.getByText('Tekrar gönder (60s)')).toBeOnTheScreen());
    expect(screen.getByTestId('resend-verification-button')).toBeDisabled();
  });

  it('J45.7 misafir: geçersiz e-posta → resend-verification çağrılmaz, doğrulama mesajı çıkar', async () => {
    mockParams = { token: 'used' };
    mockVerify.mockRejectedValue({});
    renderWithProviders(<VerifyEmailScreen />);

    await waitFor(() => expect(screen.getByText('Doğrulama Başarısız')).toBeOnTheScreen());
    fireEvent.changeText(screen.getByTestId('resend-verification-email-input'), 'gecersiz');
    fireEvent.press(screen.getByTestId('resend-verification-button'));

    await waitFor(() => expect(screen.getByText('Geçerli e-posta girin')).toBeOnTheScreen());
    expect(mockResend).not.toHaveBeenCalled();
  });

  it('J45.8 boş durumda (token yok) misafir de yeni bağlantı isteyebilir; kayıt e-postası önceden dolu', async () => {
    usePendingAuthEmailStore.setState({ email: 'yeni@demo.com' });
    renderWithProviders(<VerifyEmailScreen />);

    const input = screen.getByTestId('resend-verification-email-input');
    expect(input.props.value).toBe('yeni@demo.com');
    fireEvent.press(screen.getByTestId('resend-verification-button'));
    await waitFor(() => expect(mockResend).toHaveBeenCalledWith('yeni@demo.com'));
  });

  it('J45.9 başarı + bilinen e-posta → "Giriş Yap" e-postayı login\'e taşır ve bellekteki kopyayı siler', async () => {
    usePendingAuthEmailStore.setState({ email: 'kayit@demo.com' });
    mockParams = { token: 'good-token' };
    mockVerify.mockResolvedValue({});
    renderWithProviders(<VerifyEmailScreen />);

    await waitFor(() => expect(screen.getByText('E-posta Doğrulandı!')).toBeOnTheScreen());
    expect(
      screen.getByText(/Artık hesabınıza giriş yapabilirsiniz/),
    ).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Giriş Yap'));
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/(auth)/login',
      params: { email: 'kayit@demo.com' },
    });
    expect(usePendingAuthEmailStore.getState().email).toBeNull();
  });

  it('J45.10 başarı + `?email=` param → login\'e o e-posta taşınır', async () => {
    mockParams = { token: 'good-token', email: 'param@demo.com' };
    mockVerify.mockResolvedValue({});
    renderWithProviders(<VerifyEmailScreen />);

    await waitFor(() => expect(screen.getByText('E-posta Doğrulandı!')).toBeOnTheScreen());
    fireEvent.press(screen.getByText('Giriş Yap'));
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/(auth)/login',
      params: { email: 'param@demo.com' },
    });
  });

  it('J45.11 girişli kullanıcı: e-posta alanı yok, düğme oturum e-postasına gönderir', async () => {
    mockParams = { token: 'expired' };
    mockAuth = { isAuthenticated: true, user: { email: 'a@b.com' } };
    mockVerify.mockRejectedValue({});
    renderWithProviders(<VerifyEmailScreen />);

    await waitFor(() => expect(screen.getByText('Doğrulama Başarısız')).toBeOnTheScreen());
    expect(screen.queryByTestId('resend-verification-email-input')).toBeNull();
    fireEvent.press(screen.getByTestId('resend-verification-button'));
    await waitFor(() => expect(mockResend).toHaveBeenCalledWith('a@b.com'));
  });
});
