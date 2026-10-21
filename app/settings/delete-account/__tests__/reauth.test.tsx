/**
 * Account deletion with the step-up (sign-in methods delta 2026-10-21, mobile P0 before the
 * setting is switched on): after the typed confirmation the confirm step runs, and its token
 * goes in the `X-Reauth-Token` header (`userApi.deleteAccount(token)`). Cancelling sends nothing.
 * A device that cannot confirm still deletes without a token (store account-deletion rules).
 * A step-up error never signs out; only the successful deletion signs out locally.
 */
import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils/render';
import { toast } from '@/ui';
import { dismissToMock, resetRouterMocks } from '@/test-utils/router-mock';

jest.mock('expo-router', () => jest.requireActual('@/test-utils/router-mock').routerMock);
jest.mock('@/ui', () => ({
  ...jest.requireActual('@/ui'),
  appAlert: jest.fn(),
  runAfterModalClose: (next: () => void) => next(),
  toast: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn(), dismiss: jest.fn() }),
}));
const mockLogout = jest.fn((_opts?: unknown) => Promise.resolve());
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (state: Record<string, unknown>) => unknown) => {
    const state: Record<string, unknown> = { isAuthenticated: true, user: { id: 'u1', email: 'me@ornek.com' }, logout: mockLogout };
    return sel ? sel(state) : state;
  },
}));
const mockDelete = jest.fn();
const mockGetSignInMethods = jest.fn();
const mockReauth = jest.fn();
jest.mock('@/lib/api', () => ({
  userApi: { deleteAccount: (token?: string) => mockDelete(token) },
  authApi: {
    getSignInMethods: () => mockGetSignInMethods(),
    reauth: (proof: unknown) => mockReauth(proof),
    forgotPassword: jest.fn(),
  },
  errorText: jest.requireActual('@/lib/api/errorText').errorText,
}));
jest.mock('@/services/googleSignin', () => ({ isGoogleConfigured: () => false, signInWithGoogle: jest.fn() }));
jest.mock('@/services/appleSignin', () => ({ isAppleAvailable: () => Promise.resolve(false), signInWithApple: jest.fn() }));

import DeleteAccountScreen from '../index';

const typeKeywordAndSubmit = async () => {
  fireEvent.changeText(screen.getByTestId('delete-account-confirm-input'), 'SİL');
  await act(async () => {
    fireEvent.press(screen.getByTestId('delete-account-submit'));
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
  mockGetSignInMethods.mockResolvedValue({ data: { hasPassword: true, providers: [] } });
  mockReauth.mockResolvedValue({ data: { reauthToken: 'tok-1', expiresAt: new Date(Date.now() + 300_000).toISOString() } });
  mockDelete.mockResolvedValue({ data: {} });
});

it('confirm step first, then DELETE with the token; success signs out locally and goes home', async () => {
  renderWithProviders(<DeleteAccountScreen />);
  await typeKeywordAndSubmit();
  expect(mockDelete).not.toHaveBeenCalled();
  await confirmPassword();

  await waitFor(() => expect(dismissToMock).toHaveBeenCalledWith('/(tabs)'));
  expect(mockReauth).toHaveBeenCalledWith({ password: 'Secret123' });
  expect(mockDelete).toHaveBeenCalledWith('tok-1');
  expect(mockLogout).toHaveBeenCalledWith({ reason: 'accountDeleted' });
});

it('cancelling the confirm step deletes nothing and unlocks the button', async () => {
  renderWithProviders(<DeleteAccountScreen />);
  await typeKeywordAndSubmit();
  fireEvent.press(await screen.findByTestId('reauth-cancel'));

  await waitFor(() => expect(screen.queryByTestId('reauth-password-input')).toBeNull());
  expect(mockDelete).not.toHaveBeenCalled();
  expect(mockLogout).not.toHaveBeenCalled();
  expect(screen.getByTestId('delete-account-submit').props.accessibilityState?.disabled).toBe(false);
});

it('a wrong password stays in the confirm step: no deletion, no sign-out', async () => {
  mockReauth.mockRejectedValueOnce({
    isAxiosError: true,
    response: { status: 403, data: { statusCode: 403, message: 'We could not confirm it is you.', errorCode: 'REAUTH_FAILED' } },
  });
  renderWithProviders(<DeleteAccountScreen />);
  await typeKeywordAndSubmit();
  await confirmPassword();

  expect(await screen.findByText('We could not confirm it is you.')).toBeTruthy();
  expect(mockDelete).not.toHaveBeenCalled();
  expect(mockLogout).not.toHaveBeenCalled();
});

it('REAUTH_REQUIRED on DELETE (token expired): confirm again, retry with the new token', async () => {
  mockDelete
    .mockRejectedValueOnce({ isAxiosError: true, response: { status: 403, data: { statusCode: 403, errorCode: 'REAUTH_REQUIRED' } } })
    .mockResolvedValueOnce({ data: {} });
  mockReauth
    .mockResolvedValueOnce({ data: { reauthToken: 'tok-1', expiresAt: 'x' } })
    .mockResolvedValueOnce({ data: { reauthToken: 'tok-2', expiresAt: 'x' } });
  renderWithProviders(<DeleteAccountScreen />);
  await typeKeywordAndSubmit();
  await confirmPassword();
  await confirmPassword();

  await waitFor(() => expect(mockLogout).toHaveBeenCalledWith({ reason: 'accountDeleted' }));
  expect(mockDelete.mock.calls).toEqual([['tok-1'], ['tok-2']]);
});

it('Android, Apple-only account (cannot confirm here): deletes without a token, never blocked', async () => {
  mockGetSignInMethods.mockResolvedValue({
    data: { hasPassword: false, providers: [{ provider: 'apple', email: null, linkedAt: '2026-10-01T00:00:00.000Z' }] },
  });
  renderWithProviders(<DeleteAccountScreen />);
  await typeKeywordAndSubmit();

  await waitFor(() => expect(mockDelete).toHaveBeenCalledWith(undefined));
  expect(mockReauth).not.toHaveBeenCalled();
  expect(toast.success).toHaveBeenCalled();
});
