/**
 * Set a password (web `SecuritySection` set mode) for an account without one: the form, then
 * the confirm step with a linked provider, then `POST /auth/password/set` with the step-up token.
 * Success writes the answer to `qk.auth.signInMethods` (the hub turns into "Change password"
 * without a reload); `409 PASSWORD_ALREADY_SET` goes back; a device that cannot confirm sends
 * the set-password mail (ADR 0012); no error signs out.
 */
import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { toast } from '@/ui';
import { QueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/query';
import { renderWithProviders } from '@/test-utils';
import { backMock, canGoBackMock, resetRouterMocks } from '@/test-utils/router-mock';
import { expectCachesFreeOf } from '@/test-utils/cacheSecrets';
import i18n from '@/i18n/config';

jest.mock('expo-router', () => jest.requireActual('@/test-utils/router-mock').routerMock);
jest.mock('@/ui', () => ({
  ...jest.requireActual('@/ui'),
  appAlert: jest.fn(),
  runAfterModalClose: (next: () => void) => next(),
  toast: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn(), dismiss: jest.fn() }),
}));
const mockLogout = jest.fn();
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (s: Record<string, unknown>) => unknown) => {
    const state = { isAuthenticated: true, user: { id: 'u1', email: 'me@ornek.com' }, logout: mockLogout };
    return sel ? sel(state) : state;
  },
}));

const mockGetSignInMethods = jest.fn();
const mockReauth = jest.fn();
const mockSetPassword = jest.fn();
const mockForgotPassword = jest.fn((_email: string) => Promise.resolve({ data: {} }));
jest.mock('@/lib/api', () => ({
  authApi: {
    getSignInMethods: () => mockGetSignInMethods(),
    reauth: (proof: unknown) => mockReauth(proof),
    setPassword: (body: unknown) => mockSetPassword(body),
    forgotPassword: (email: string) => mockForgotPassword(email),
  },
}));
let mockGoogleConfigured = true;
const mockSignInWithGoogle = jest.fn((_opts?: unknown) => Promise.resolve('google-id-token'));
jest.mock('@/services/googleSignin', () => ({
  isGoogleConfigured: () => mockGoogleConfigured,
  signInWithGoogle: (opts: unknown) => mockSignInWithGoogle(opts),
}));
jest.mock('@/services/appleSignin', () => ({
  isAppleAvailable: () => Promise.resolve(false),
  signInWithApple: jest.fn(),
}));
const mockCapture = jest.fn();
jest.mock('@/services/sentry', () => ({ captureException: (...a: unknown[]) => mockCapture(...a) }));

import SetPasswordScreen from '../set-password';

const googleOnly = {
  hasPassword: false,
  providers: [{ provider: 'google', email: 'me@gmail.com', linkedAt: '2026-10-01T00:00:00.000Z' }],
};
const withPassword = { ...googleOnly, hasPassword: true };
const conflict = {
  isAxiosError: true,
  response: {
    status: 409,
    data: { statusCode: 409, message: 'This account already has a password.', errorCode: 'PASSWORD_ALREADY_SET' },
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  resetRouterMocks();
  canGoBackMock.mockReturnValue(true);
  mockGoogleConfigured = true;
  mockGetSignInMethods.mockResolvedValue({ data: googleOnly });
  mockReauth.mockResolvedValue({ data: { reauthToken: 'tok-1', expiresAt: new Date(Date.now() + 300_000).toISOString() } });
  mockSetPassword.mockResolvedValue({ data: withPassword });
});

function fillAndSubmit(next = 'Yeni1234', repeat = next, queryClient?: QueryClient) {
  const utils = renderWithProviders(<SetPasswordScreen />, queryClient ? { queryClient } : undefined);
  fireEvent.changeText(screen.getByTestId('set-password-new-input'), next);
  fireEvent.changeText(screen.getByTestId('set-password-confirm-input'), repeat);
  fireEvent.press(screen.getByTestId('set-password-submit'));
  return utils;
}

async function confirmWithGoogle() {
  const button = await screen.findByTestId('reauth-google-button');
  await act(async () => {
    fireEvent.press(button);
  });
}

describe('settings/security/set-password', () => {
  it('shows the intro, the policy hint and no current-password field', () => {
    renderWithProviders(<SetPasswordScreen />);
    expect(screen.getByText(i18n.t('profile.security.setPasswordIntro'))).toBeTruthy();
    expect(screen.queryByTestId('current-password-input')).toBeNull();
    fireEvent.changeText(screen.getByTestId('set-password-new-input'), 'Yenisifre');
    expect(screen.getByText(i18n.t('auth.pwHintNumber'))).toBeTruthy();
  });

  it('a form error stays inline: no confirm step, no request', async () => {
    fillAndSubmit('Yeni1234', 'Yeni1235');
    expect(await screen.findByText(i18n.t('validation.passwordMatch'))).toBeTruthy();
    expect(screen.queryByTestId('reauth-google-button')).toBeNull();
    expect(mockReauth).not.toHaveBeenCalled();
    expect(mockSetPassword).not.toHaveBeenCalled();
  });

  it('success: confirm with Google, set with the token, write the answer, toast, back', async () => {
    // The hub below keeps the sign-in methods query alive in the app; here a client that keeps it.
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    mockGetSignInMethods.mockResolvedValueOnce({ data: googleOnly }).mockResolvedValue({ data: withPassword });
    fillAndSubmit('Yeni1234', 'Yeni1234', queryClient);
    await confirmWithGoogle();

    await waitFor(() => expect(backMock).toHaveBeenCalled());
    expect(mockSignInWithGoogle).toHaveBeenCalledWith({ fresh: true });
    expect(mockReauth).toHaveBeenCalledWith({ provider: 'google', idToken: 'google-id-token' });
    expect(mockSetPassword).toHaveBeenCalledWith({ newPassword: 'Yeni1234', reauthToken: 'tok-1' });
    expect(toast.success).toHaveBeenCalledWith(i18n.t('profile.security.setPasswordSuccess'));
    expect(queryClient.getQueryData(qk.auth.signInMethods)).toMatchObject({ hasPassword: true });
  });

  it('the step-up token expired between confirm and set: confirm again once, then set', async () => {
    mockSetPassword
      .mockRejectedValueOnce({
        isAxiosError: true,
        response: { status: 403, data: { statusCode: 403, errorCode: 'REAUTH_REQUIRED' } },
      })
      .mockResolvedValueOnce({ data: withPassword });
    mockReauth
      .mockResolvedValueOnce({ data: { reauthToken: 'tok-1', expiresAt: 'x' } })
      .mockResolvedValueOnce({ data: { reauthToken: 'tok-2', expiresAt: 'x' } });
    fillAndSubmit();
    await confirmWithGoogle();
    await confirmWithGoogle();

    await waitFor(() => expect(backMock).toHaveBeenCalled());
    expect(mockSetPassword.mock.calls.map(([b]) => b.reauthToken)).toEqual(['tok-1', 'tok-2']);
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it('409 PASSWORD_ALREADY_SET: the server message, back to the hub (which now offers Change)', async () => {
    mockSetPassword.mockRejectedValueOnce(conflict);
    fillAndSubmit();
    await confirmWithGoogle();

    await waitFor(() => expect(backMock).toHaveBeenCalled());
    expect(toast.error).toHaveBeenCalledWith('This account already has a password.');
    expect(toast.success).not.toHaveBeenCalled();
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it('a 5xx: toast, the screen stays, reported to Sentry without the body', async () => {
    const down = { isAxiosError: true, response: { status: 500, data: { statusCode: 500 } } };
    mockSetPassword.mockRejectedValueOnce(down);
    fillAndSubmit();
    await confirmWithGoogle();

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(backMock).not.toHaveBeenCalled();
    expect(mockCapture).toHaveBeenCalledWith(down, { level: 'error', tags: { flow: 'auth.password_set' } });
  });

  it('cancelling the confirm step sends nothing and keeps the form', async () => {
    fillAndSubmit();
    fireEvent.press(await screen.findByTestId('reauth-cancel'));
    await waitFor(() => expect(screen.queryByTestId('reauth-google-button')).toBeNull());
    expect(mockSetPassword).not.toHaveBeenCalled();
    expect(screen.getByTestId('set-password-new-input').props.value).toBe('Yeni1234');
  });

  it('a double tap opens one confirm step and sets once', async () => {
    renderWithProviders(<SetPasswordScreen />);
    fireEvent.changeText(screen.getByTestId('set-password-new-input'), 'Yeni1234');
    fireEvent.changeText(screen.getByTestId('set-password-confirm-input'), 'Yeni1234');
    fireEvent.press(screen.getByTestId('set-password-submit'));
    fireEvent.press(screen.getByTestId('set-password-submit'));
    await confirmWithGoogle();

    await waitFor(() => expect(backMock).toHaveBeenCalledTimes(1));
    expect(mockReauth).toHaveBeenCalledTimes(1);
    expect(mockSetPassword).toHaveBeenCalledTimes(1);
  });

  it('the new password and the step-up token are gone from the query caches once the screen is', async () => {
    const { queryClient, unmount } = fillAndSubmit();
    await confirmWithGoogle();
    await waitFor(() => expect(backMock).toHaveBeenCalled());

    await expectCachesFreeOf(queryClient, unmount, ['tok-1', 'Yeni1234', 'google-id-token']);
  });

  it('Android fallback: no linked provider this device shows -> the set-password mail, no step-up', async () => {
    mockGoogleConfigured = false;
    fillAndSubmit();

    await waitFor(() => expect(mockForgotPassword).toHaveBeenCalledWith('me@ornek.com'));
    expect(toast.success).toHaveBeenCalledWith(i18n.t('auth.setPasswordEmailSent'));
    expect(mockReauth).not.toHaveBeenCalled();
    expect(mockSetPassword).not.toHaveBeenCalled();
  });
});
