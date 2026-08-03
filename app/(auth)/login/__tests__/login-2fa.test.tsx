/**
 * Login 2FA dalı: sunucu 200 + { requires2FA: true } döndüğünde bu bir HATA değil,
 * akış adımıdır — kod alanı gösterilir ve aynı kimlik bilgileri twoFactorCode ile
 * tekrar gönderilir. Kod formatı: 6 hane TOTP veya XXXX-XXXX yedek kod.
 */
import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => false },
  Link: ({ children }: any) => children,
  useLocalSearchParams: () => ({}),
}));

jest.mock('@/lib/api', () => ({
  authApi: {
    login: jest.fn(),
    getProfile: jest.fn(() => Promise.resolve({ data: { user: {} } })),
    resendVerification: jest.fn(),
  },
}));
import { authApi } from '@/lib/api';

jest.mock('@/services/googleSignin', () => ({
  signInWithGoogle: jest.fn(),
  isGoogleConfigured: () => false,
}));
jest.mock('@/services/appleSignin', () => ({
  signInWithApple: jest.fn(),
  isAppleAvailable: () => Promise.resolve(false),
}));

const mockLogin = jest.fn();
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (state: any) => unknown) => {
    const state: any = ({ login: mockLogin });
    return sel ? sel(state) : state;
  },
}));

import LoginScreen from '../index';

const fillCredentials = () => {
  fireEvent.changeText(screen.getByTestId('login-email-input'), 'a@b.com');
  fireEvent.changeText(screen.getByTestId('login-password-input'), 'Password1');
};

beforeEach(() => jest.clearAllMocks());

it('requires2FA yanıtında oturum açmaz, kod alanını gösterir', async () => {
  (authApi.login as jest.Mock).mockResolvedValue({ data: { requires2FA: true } });
  renderWithProviders(<LoginScreen />);
  fillCredentials();
  fireEvent.press(screen.getByTestId('login-submit-button'));

  await waitFor(() => expect(screen.getByTestId('login-2fa-code-input')).toBeTruthy());
  expect(mockLogin).not.toHaveBeenCalled();
});

it('kodu aynı kimlik bilgileriyle birlikte gönderir', async () => {
  (authApi.login as jest.Mock).mockResolvedValueOnce({ data: { requires2FA: true } });
  renderWithProviders(<LoginScreen />);
  fillCredentials();
  fireEvent.press(screen.getByTestId('login-submit-button'));
  await waitFor(() => expect(screen.getByTestId('login-2fa-code-input')).toBeTruthy());

  (authApi.login as jest.Mock).mockResolvedValueOnce({
    data: { tokens: { accessToken: 'at', refreshToken: 'rt' }, user: { email: 'a@b.com' } },
  });
  fireEvent.changeText(screen.getByTestId('login-2fa-code-input'), '123456');
  fireEvent.press(screen.getByTestId('login-submit-button'));

  await waitFor(() => expect(authApi.login).toHaveBeenLastCalledWith('a@b.com', 'Password1', '123456'));
  await waitFor(() => expect(mockLogin).toHaveBeenCalledWith('at', expect.anything(), 'rt'));
});

it('yedek kod biçimini (XXXX-XXXX) kabul eder', async () => {
  (authApi.login as jest.Mock).mockResolvedValueOnce({ data: { requires2FA: true } });
  renderWithProviders(<LoginScreen />);
  fillCredentials();
  fireEvent.press(screen.getByTestId('login-submit-button'));
  await waitFor(() => expect(screen.getByTestId('login-2fa-code-input')).toBeTruthy());

  (authApi.login as jest.Mock).mockResolvedValueOnce({
    data: { tokens: { accessToken: 'at' }, user: {} },
  });
  fireEvent.changeText(screen.getByTestId('login-2fa-code-input'), 'A1B2-C3D4');
  fireEvent.press(screen.getByTestId('login-submit-button'));

  await waitFor(() => expect(authApi.login).toHaveBeenLastCalledWith('a@b.com', 'Password1', 'A1B2-C3D4'));
});

it('geçersiz biçimde kodu göndermez', async () => {
  (authApi.login as jest.Mock).mockResolvedValueOnce({ data: { requires2FA: true } });
  renderWithProviders(<LoginScreen />);
  fillCredentials();
  fireEvent.press(screen.getByTestId('login-submit-button'));
  await waitFor(() => expect(screen.getByTestId('login-2fa-code-input')).toBeTruthy());

  (authApi.login as jest.Mock).mockClear();
  fireEvent.changeText(screen.getByTestId('login-2fa-code-input'), '12');
  fireEvent.press(screen.getByTestId('login-submit-button'));

  await waitFor(() => expect(screen.getByText(/6 haneli kod/i)).toBeTruthy());
  expect(authApi.login).not.toHaveBeenCalled();
});
