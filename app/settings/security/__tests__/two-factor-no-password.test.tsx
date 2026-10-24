/**
 * 2FA for an account without a password (web `/profile/security` hint): `enable2FA` needs an
 * account password, so the screen shows "set a password first" with a "Set a password" action
 * instead of calling `enable` and showing the raw `server.security.passwordRequiredFor2fa` error.
 */
import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { QueryClient } from '@tanstack/react-query';
import { toast } from '@/ui';
import { qk } from '@/lib/query';
import { renderWithProviders } from '@/test-utils';
import { pushMock, resetRouterMocks } from '@/test-utils/router-mock';
import i18n from '@/i18n/config';

jest.mock('@/ui', () => ({
  ...jest.requireActual('@/ui'),
  appAlert: jest.fn(),
  toast: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn(), dismiss: jest.fn() }),
}));
jest.mock('expo-router', () => jest.requireActual('@/test-utils/router-mock').routerMock);
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (state: Record<string, unknown>) => unknown) => {
    const state: Record<string, unknown> = { isAuthenticated: true, user: { id: 'u1', email: 'me@ornek.com' } };
    return sel ? sel(state) : state;
  },
}));
let mockGoogleConfigured = true;
jest.mock('@/services/googleSignin', () => ({ isGoogleConfigured: () => mockGoogleConfigured }));
jest.mock('@/services/appleSignin', () => ({ isAppleAvailable: () => Promise.resolve(false) }));

const mockGetSignInMethods = jest.fn();
const mockSetup = jest.fn();
const mockForgotPassword = jest.fn((_email: string) => Promise.resolve({ data: {} }));
jest.mock('@/lib/api', () => ({
  authApi: {
    getTwoFactorStatus: () => Promise.resolve({ data: { isEnabled: false } }),
    getSignInMethods: () => mockGetSignInMethods(),
    setupTwoFactor: () => mockSetup(),
    forgotPassword: (email: string) => mockForgotPassword(email),
  },
}));

import TwoFactorScreen from '../two-factor';

const googleOnly = {
  data: { hasPassword: false, providers: [{ provider: 'google', email: null, linkedAt: '2026-10-01T00:00:00.000Z' }] },
};
const setupBody = { data: { secret: 'JBSWY3DPEHPK3PXP', qrCodeImage: 'data:image/png;base64,AAA', backupCodes: ['A1'] } };

beforeEach(() => {
  jest.clearAllMocks();
  resetRouterMocks();
  mockGoogleConfigured = true;
  mockGetSignInMethods.mockResolvedValue(googleOnly);
  mockSetup.mockResolvedValue(setupBody);
});

it('no password: the hint and "Set a password", no `enable` call, no raw error', async () => {
  renderWithProviders(<TwoFactorScreen />);
  expect(await screen.findByText(i18n.t('profile.security.passwordFirstFor2fa'))).toBeTruthy();
  expect(screen.queryByTestId('two-factor-secret')).toBeNull();
  expect(screen.queryByTestId('two-factor-verify')).toBeNull();
  expect(mockSetup).not.toHaveBeenCalled();

  fireEvent.press(screen.getByTestId('two-factor-set-password'));
  await waitFor(() => expect(pushMock).toHaveBeenLastCalledWith('/settings/security/set-password'));
});

it('no password on Android without the linked provider: "Set a password" sends the mail', async () => {
  mockGoogleConfigured = false;
  renderWithProviders(<TwoFactorScreen />);
  fireEvent.press(await screen.findByTestId('two-factor-set-password'));
  await waitFor(() => expect(mockForgotPassword).toHaveBeenCalledWith('me@ornek.com'));
  expect(toast.success).toHaveBeenCalledWith(i18n.t('auth.setPasswordEmailSent'));
  expect(pushMock).not.toHaveBeenCalled();
});

it('the sign-in methods cannot be read and the server refuses: the same hint instead of the raw error', async () => {
  mockGetSignInMethods.mockRejectedValue({ isAxiosError: true, response: { status: 404, data: {} } });
  mockSetup.mockRejectedValue({
    isAxiosError: true,
    response: {
      status: 400,
      data: { statusCode: 400, message: 'raw', i18nKey: 'server.security.passwordRequiredFor2fa' },
    },
  });
  renderWithProviders(<TwoFactorScreen />);
  expect(await screen.findByTestId('two-factor-needs-password')).toBeTruthy();
  expect(screen.queryByText('raw')).toBeNull();
});

it('with a password: the setup starts as before', async () => {
  mockGetSignInMethods.mockResolvedValue({ data: { hasPassword: true, providers: [] } });
  renderWithProviders(<TwoFactorScreen />);
  expect(await screen.findByTestId('two-factor-secret')).toBeTruthy();
  expect(mockSetup).toHaveBeenCalledTimes(1);
  expect(screen.queryByTestId('two-factor-needs-password')).toBeNull();
});

it('a password set meanwhile (back from set-password): the setup starts once', async () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  renderWithProviders(<TwoFactorScreen />, { queryClient });
  await screen.findByTestId('two-factor-needs-password');

  mockGetSignInMethods.mockResolvedValue({ data: { hasPassword: true, providers: [] } });
  await act(async () => {
    queryClient.setQueryData(qk.auth.signInMethods, { hasPassword: true, providers: [] });
  });

  expect(await screen.findByTestId('two-factor-secret')).toBeTruthy();
  expect(mockSetup).toHaveBeenCalledTimes(1);
});
