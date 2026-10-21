/**
 * E-mail change with the step-up (sign-in methods delta 2026-10-21, mobile P0 before the setting
 * is switched on): "Send code" runs the confirm step first and sends `reauthToken` in the body
 * of `POST /auth/email/request-change`; the resend reuses the token on the same screen; cancelling
 * sends nothing; a step-up failure stays in the confirm step and never signs out.
 */
import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils/render';
import { resetRouterMocks } from '@/test-utils/router-mock';
import { expectCachesFreeOf } from '@/test-utils/cacheSecrets';

jest.mock('expo-router', () => jest.requireActual('@/test-utils/router-mock').routerMock);
jest.mock('@/ui', () => ({
  ...jest.requireActual('@/ui'),
  appAlert: jest.fn(),
  runAfterModalClose: (next: () => void) => next(),
  toast: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn(), dismiss: jest.fn() }),
}));
const mockLogout = jest.fn();
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (state: Record<string, unknown>) => unknown) => {
    const state: Record<string, unknown> = {
      isAuthenticated: true,
      user: { id: 'u1', email: 'eski@ornek.com', isEmailVerified: true },
      updateUser: jest.fn(),
      refreshUserData: jest.fn(() => Promise.resolve(null)),
      logout: mockLogout,
    };
    return sel ? sel(state) : state;
  },
}));
const mockRequest = jest.fn();
const mockReauth = jest.fn();
const mockGetSignInMethods = jest.fn();
jest.mock('@/lib/api', () => ({
  authApi: {
    getSignInMethods: () => mockGetSignInMethods(),
    reauth: (proof: unknown) => mockReauth(proof),
    requestEmailChange: (email: string, token?: string) => mockRequest(email, token),
    verifyEmailChange: jest.fn(),
    forgotPassword: jest.fn(),
  },
  errorText: jest.requireActual('@/lib/api/errorText').errorText,
}));
jest.mock('@/services/googleSignin', () => ({ isGoogleConfigured: () => false, signInWithGoogle: jest.fn() }));
jest.mock('@/services/appleSignin', () => ({ isAppleAvailable: () => Promise.resolve(false), signInWithApple: jest.fn() }));

import EmailChangeScreen from '../email';

const sendCode = async () => {
  fireEvent.changeText(screen.getByTestId('email-change-input'), 'yeni@ornek.com');
  await act(async () => {
    fireEvent.press(screen.getByTestId('email-change-request'));
  });
};
const confirmPassword = async () => {
  fireEvent.changeText(await screen.findByTestId('reauth-password-input'), 'Secret123');
  await act(async () => {
    fireEvent.press(screen.getByTestId('reauth-confirm'));
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  resetRouterMocks();
  mockReauth.mockResolvedValue({ data: { reauthToken: 'tok-1', expiresAt: new Date(Date.now() + 300_000).toISOString() } });
  mockRequest.mockResolvedValue({ data: { message: 'ok' } });
  mockGetSignInMethods.mockResolvedValue({ data: { hasPassword: true, providers: [] } });
});

it('confirm step first, then the request with `reauthToken`; the code step opens', async () => {
  renderWithProviders(<EmailChangeScreen />);
  await sendCode();
  expect(mockRequest).not.toHaveBeenCalled();
  await confirmPassword();

  expect(await screen.findByTestId('email-change-code')).toBeTruthy();
  expect(mockRequest).toHaveBeenCalledWith('yeni@ornek.com', 'tok-1');
});

it('the resend reuses the token on this screen (no second confirm step)', async () => {
  jest.useFakeTimers();
  try {
    renderWithProviders(<EmailChangeScreen />);
    await sendCode();
    await confirmPassword();
    await screen.findByTestId('email-change-code');

    await act(async () => {
      await jest.advanceTimersByTimeAsync(60_000);
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId('email-change-resend'));
    });

    await waitFor(() => expect(mockRequest).toHaveBeenCalledTimes(2));
    expect(mockRequest).toHaveBeenLastCalledWith('yeni@ornek.com', 'tok-1');
    expect(mockReauth).toHaveBeenCalledTimes(1);
  } finally {
    jest.useRealTimers();
  }
});

it('cancelling the confirm step sends nothing and stays on the e-mail step', async () => {
  renderWithProviders(<EmailChangeScreen />);
  await sendCode();
  fireEvent.press(await screen.findByTestId('reauth-cancel'));

  await waitFor(() => expect(screen.queryByTestId('reauth-password-input')).toBeNull());
  expect(mockRequest).not.toHaveBeenCalled();
  expect(screen.getByTestId('email-change-input')).toBeTruthy();
});

it('a locked step-up (429 REAUTH_LOCKED) stays in the confirm step: no request, no sign-out', async () => {
  mockReauth.mockRejectedValueOnce({
    isAxiosError: true,
    response: { status: 429, data: { statusCode: 429, message: 'Too many attempts.', errorCode: 'REAUTH_LOCKED' } },
  });
  renderWithProviders(<EmailChangeScreen />);
  await sendCode();
  await confirmPassword();

  expect(await screen.findByText('Too many attempts.')).toBeTruthy();
  expect(mockRequest).not.toHaveBeenCalled();
  expect(mockLogout).not.toHaveBeenCalled();
});

it('a request error after the confirm step shows under the e-mail field', async () => {
  mockRequest.mockRejectedValueOnce({
    isAxiosError: true,
    response: { status: 409, data: { statusCode: 409, message: 'This e-mail is in use.' } },
  });
  renderWithProviders(<EmailChangeScreen />);
  await sendCode();
  await confirmPassword();

  expect(await screen.findByText('This e-mail is in use.')).toBeTruthy();
  expect(screen.queryByTestId('email-change-code')).toBeNull();
});

it('the step-up token and the password are gone from the query caches once the screen is', async () => {
  const { queryClient, unmount } = renderWithProviders(<EmailChangeScreen />);
  await sendCode();
  await confirmPassword();
  await screen.findByTestId('email-change-code');

  await expectCachesFreeOf(queryClient, unmount, ['tok-1', 'Secret123']);
});

it('Android, Apple-only account (cannot confirm here): the code request goes without a token, as 1.0.5 sends it', async () => {
  mockGetSignInMethods.mockResolvedValue({
    data: { hasPassword: false, providers: [{ provider: 'apple', email: null, linkedAt: '2026-10-01T00:00:00.000Z' }] },
  });
  renderWithProviders(<EmailChangeScreen />);
  await sendCode();

  expect(await screen.findByTestId('email-change-code')).toBeTruthy();
  expect(mockRequest.mock.calls).toEqual([['yeni@ornek.com', undefined]]);
  expect(mockReauth).not.toHaveBeenCalled();
});
