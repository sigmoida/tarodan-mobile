/**
 * The confirm step (`useReauth` + `ReauthModal`, sign-in methods delta 2026-10-21):
 *
 * - password accounts confirm with the password, as typed;
 * - accounts without one confirm with a fresh sign-in of a linked provider this device shows
 *   (Google: SDK signed out first, `idToken` only; Apple on iOS: `identityToken`);
 * - Android fallback: no provider to show means `unavailable` (or, for the setting-gated
 *   routes, the call goes without a token and a later `REAUTH_REQUIRED` offers the mail);
 * - `403 REAUTH_REQUIRED` from the action reopens the step once and retries once;
 * - a failed proof stays inside the modal and never signs out; only 5xx/network reach Sentry;
 * - the token is memory only: never persisted, not in the query or mutation cache after use.
 */
import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { appAlert, Button } from '@/ui';
import { QueryClient } from '@tanstack/react-query';
import { renderWithProviders } from '@/test-utils';
import { ReauthModal } from '@/components/auth/ReauthModal';
import i18n from '@/i18n/config';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-router', () => jest.requireActual('@/test-utils/router-mock').routerMock);
jest.mock('@/ui', () => ({
  ...jest.requireActual('@/ui'),
  appAlert: jest.fn(),
  // The real helper waits for the close animation; the order is what matters here.
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
const mockForgotPassword = jest.fn((_email: string) => Promise.resolve({ data: {} }));
jest.mock('@/lib/api', () => ({
  authApi: {
    getSignInMethods: () => mockGetSignInMethods(),
    reauth: (proof: unknown) => mockReauth(proof),
    forgotPassword: (email: string) => mockForgotPassword(email),
  },
}));

let mockGoogleConfigured = true;
const mockSignInWithGoogle = jest.fn();
jest.mock('@/services/googleSignin', () => ({
  isGoogleConfigured: () => mockGoogleConfigured,
  signInWithGoogle: (opts: unknown) => mockSignInWithGoogle(opts),
}));
let mockAppleAvailable = false;
const mockSignInWithApple = jest.fn();
jest.mock('@/services/appleSignin', () => ({
  isAppleAvailable: () => Promise.resolve(mockAppleAvailable),
  signInWithApple: () => mockSignInWithApple(),
}));
const mockCapture = jest.fn();
jest.mock('@/services/sentry', () => ({
  captureException: (...args: unknown[]) => mockCapture(...args),
}));

import { REAUTH_EXPIRY_MARGIN_MS, useReauth, type ReauthOutcome } from '../useReauth';

const TOKEN_1 = 'step-up-token-1-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const TOKEN_2 = 'step-up-token-2-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
/** A token that lives the API's 300 s from now (device clock). */
const ok = (reauthToken: string) => ({ data: { reauthToken, expiresAt: new Date(Date.now() + 300_000).toISOString() } });
const apiError = (status: number, errorCode?: string, message = 'server says no') => ({
  isAxiosError: true,
  response: { status, data: { statusCode: status, message, errorCode } },
});
const withPassword = { data: { hasPassword: true, providers: [] } };
const linked = (...providers: ('google' | 'apple')[]) => ({
  data: {
    hasPassword: false,
    providers: providers.map((provider, i) => ({ provider, email: null, linkedAt: `2026-10-0${i + 1}T00:00:00.000Z` })),
  },
});

type Result = ReauthOutcome<unknown> | { thrown: unknown };
let results: Result[] = [];

function Harness({ action, gated }: { action: jest.Mock; gated?: boolean }) {
  const reauth = useReauth('account_delete');
  return (
    <>
      <Button
        testID="run"
        title="run"
        onPress={async () => {
          try {
            results.push(await (gated ? reauth.runGated(action) : reauth.run(action)));
          } catch (thrown) {
            results.push({ thrown });
          }
        }}
      />
      <ReauthModal {...reauth.modal} />
    </>
  );
}

function setup(action: jest.Mock, { gated = false }: { gated?: boolean } = {}) {
  return renderWithProviders(<Harness action={action} gated={gated} />);
}

async function confirmPassword(password = 'Secret123') {
  fireEvent.changeText(await screen.findByTestId('reauth-password-input'), password);
  await act(async () => {
    fireEvent.press(screen.getByTestId('reauth-confirm'));
  });
}

const lastResult = () => results[results.length - 1];

beforeEach(() => {
  jest.clearAllMocks();
  results = [];
  mockGoogleConfigured = true;
  mockAppleAvailable = false;
  mockGetSignInMethods.mockResolvedValue(withPassword);
  mockReauth.mockResolvedValue(ok(TOKEN_1));
  mockSignInWithGoogle.mockResolvedValue('google-id-token');
  mockSignInWithApple.mockResolvedValue({ identityToken: 'apple-id-token', authorizationCode: 'apple-code' });
});

describe('password accounts', () => {
  it('asks for the password, sends it as typed, runs the action with the token', async () => {
    const action = jest.fn().mockResolvedValue('deleted');
    setup(action);
    fireEvent.press(screen.getByTestId('run'));
    expect(await screen.findByText(i18n.t('auth.reauth.title'))).toBeTruthy();
    expect(screen.getByText(i18n.t('auth.reauth.body'))).toBeTruthy();
    expect(screen.queryByTestId('reauth-google-button')).toBeNull();

    await confirmPassword(' Secret123 ');

    await waitFor(() => expect(lastResult()).toEqual({ status: 'done', value: 'deleted' }));
    expect(mockReauth).toHaveBeenCalledWith({ password: ' Secret123 ' });
    expect(action).toHaveBeenCalledWith(TOKEN_1);
    expect(screen.queryByTestId('reauth-password-input')).toBeNull();
  });

  it('an empty password stays in the modal, nothing is sent', async () => {
    setup(jest.fn());
    fireEvent.press(screen.getByTestId('run'));
    await confirmPassword('');
    expect(await screen.findByText(i18n.t('validation.passwordRequired'))).toBeTruthy();
    expect(mockReauth).not.toHaveBeenCalled();
  });

  it('reuses the token for a second action on the same screen (no second prompt)', async () => {
    const action = jest.fn().mockResolvedValue('ok');
    setup(action);
    fireEvent.press(screen.getByTestId('run'));
    await confirmPassword();
    await waitFor(() => expect(results).toHaveLength(1));

    await act(async () => {
      fireEvent.press(screen.getByTestId('run'));
    });

    await waitFor(() => expect(results).toHaveLength(2));
    expect(mockReauth).toHaveBeenCalledTimes(1);
    expect(action).toHaveBeenNthCalledWith(2, TOKEN_1);
    expect(screen.queryByTestId('reauth-password-input')).toBeNull();
  });

  it('403 REAUTH_REQUIRED from the action: confirm once more, retry once with the new token', async () => {
    const action = jest
      .fn()
      .mockRejectedValueOnce(apiError(403, 'REAUTH_REQUIRED'))
      .mockResolvedValueOnce('ok');
    mockReauth.mockResolvedValueOnce(ok(TOKEN_1)).mockResolvedValueOnce(ok(TOKEN_2));
    setup(action);
    fireEvent.press(screen.getByTestId('run'));
    await confirmPassword();
    await confirmPassword();

    await waitFor(() => expect(lastResult()).toEqual({ status: 'done', value: 'ok' }));
    expect(action.mock.calls).toEqual([[TOKEN_1], [TOKEN_2]]);
    expect(mockGetSignInMethods).toHaveBeenCalledTimes(2);
  });

  it('a second REAUTH_REQUIRED is thrown to the caller (no loop)', async () => {
    const required = apiError(403, 'REAUTH_REQUIRED');
    const action = jest.fn().mockRejectedValue(required);
    setup(action);
    fireEvent.press(screen.getByTestId('run'));
    await confirmPassword();
    await confirmPassword();

    await waitFor(() => expect(lastResult()).toEqual({ thrown: required }));
    expect(action).toHaveBeenCalledTimes(2);
  });

  it('another action error is thrown as is, without a second prompt', async () => {
    const blocked = apiError(400, undefined, 'blocked');
    const action = jest.fn().mockRejectedValue(blocked);
    setup(action);
    fireEvent.press(screen.getByTestId('run'));
    await confirmPassword();

    await waitFor(() => expect(lastResult()).toEqual({ thrown: blocked }));
    expect(mockReauth).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['403 REAUTH_FAILED', apiError(403, 'REAUTH_FAILED', 'We could not confirm it is you.'), false],
    ['429 REAUTH_LOCKED', apiError(429, 'REAUTH_LOCKED', 'Too many attempts.'), false],
    ['503 REAUTH_UNAVAILABLE', apiError(503, 'REAUTH_UNAVAILABLE', 'Not right now.'), true],
  ])('%s: the modal reopens with the server message; no sign-out; Sentry only for 5xx', async (_l, error, reported) => {
    mockReauth.mockRejectedValueOnce(error);
    const action = jest.fn();
    setup(action);
    fireEvent.press(screen.getByTestId('run'));
    await confirmPassword();

    expect(await screen.findByText(error.response.data.message)).toBeTruthy();
    expect(screen.getByTestId('reauth-password-input')).toBeTruthy();
    expect(action).not.toHaveBeenCalled();
    expect(mockLogout).not.toHaveBeenCalled();
    if (reported) {
      expect(mockCapture).toHaveBeenCalledWith(error, {
        level: 'error',
        tags: { flow: 'auth.reauth', reauthFor: 'account_delete', method: 'password' },
      });
    } else {
      expect(mockCapture).not.toHaveBeenCalled();
    }

    // The user can still back out.
    fireEvent.press(screen.getByTestId('reauth-cancel'));
    await waitFor(() => expect(lastResult()).toEqual({ status: 'cancelled' }));
  });

  it('cancel: nothing is sent, the action does not run', async () => {
    const action = jest.fn();
    setup(action);
    fireEvent.press(screen.getByTestId('run'));
    fireEvent.press(await screen.findByTestId('reauth-cancel'));
    await waitFor(() => expect(lastResult()).toEqual({ status: 'cancelled' }));
    expect(mockReauth).not.toHaveBeenCalled();
    expect(action).not.toHaveBeenCalled();
  });

  it('a 401 the client could not refresh ends quietly (the client signs out), no reopen', async () => {
    mockReauth.mockRejectedValueOnce(apiError(401));
    setup(jest.fn());
    fireEvent.press(screen.getByTestId('run'));
    await confirmPassword();
    await waitFor(() => expect(lastResult()).toEqual({ status: 'cancelled' }));
    expect(screen.queryByTestId('reauth-password-input')).toBeNull();
  });
});

describe('accounts without a password', () => {
  it('Google: one "Confirm with Google" button; the SDK signs out first; only idToken is sent', async () => {
    mockGetSignInMethods.mockResolvedValue(linked('google'));
    const action = jest.fn().mockResolvedValue('ok');
    setup(action);
    fireEvent.press(screen.getByTestId('run'));
    const button = await screen.findByTestId('reauth-google-button');
    expect(screen.getByText(i18n.t('auth.reauth.withProvider', { provider: 'Google' }))).toBeTruthy();
    expect(screen.queryByTestId('reauth-password-input')).toBeNull();

    await act(async () => {
      fireEvent.press(button);
    });

    await waitFor(() => expect(lastResult()).toEqual({ status: 'done', value: 'ok' }));
    expect(mockSignInWithGoogle).toHaveBeenCalledWith({ fresh: true });
    expect(mockReauth).toHaveBeenCalledWith({ provider: 'google', idToken: 'google-id-token' });
    expect(Object.keys(mockReauth.mock.calls[0]![0])).not.toContain('code');
    expect(action).toHaveBeenCalledWith(TOKEN_1);
  });

  it('Apple on iOS: "Confirm with Apple" sends the identityToken', async () => {
    mockAppleAvailable = true;
    mockGetSignInMethods.mockResolvedValue(linked('apple'));
    const action = jest.fn().mockResolvedValue('ok');
    setup(action);
    await act(() => Promise.resolve()); // the async Apple availability check
    fireEvent.press(screen.getByTestId('run'));
    const appleButton = await screen.findByTestId('reauth-apple-button');
    await act(async () => {
      fireEvent.press(appleButton);
    });

    await waitFor(() => expect(lastResult()).toEqual({ status: 'done', value: 'ok' }));
    expect(mockReauth).toHaveBeenCalledWith({ provider: 'apple', identityToken: 'apple-id-token' });
  });

  it('both linked, both shown: one button per provider, in link order', async () => {
    mockAppleAvailable = true;
    mockGetSignInMethods.mockResolvedValue(linked('apple', 'google'));
    setup(jest.fn());
    await act(() => Promise.resolve());
    fireEvent.press(screen.getByTestId('run'));
    expect(await screen.findByTestId('reauth-apple-button')).toBeTruthy();
    expect(screen.getByTestId('reauth-google-button')).toBeTruthy();
  });

  it('closing the native sheet brings the confirm step back, without an error', async () => {
    mockGetSignInMethods.mockResolvedValue(linked('google'));
    mockSignInWithGoogle.mockRejectedValueOnce(Object.assign(new Error('cancelled'), { code: 'SIGN_IN_CANCELLED' }));
    setup(jest.fn());
    fireEvent.press(screen.getByTestId('run'));
    const googleButton = await screen.findByTestId('reauth-google-button');
    await act(async () => {
      fireEvent.press(googleButton);
    });

    expect(await screen.findByTestId('reauth-google-button')).toBeTruthy();
    expect(screen.queryByTestId('modal-message')).toBeNull();
    expect(mockReauth).not.toHaveBeenCalled();
  });

  it('a stale Google token (403 REAUTH_FAILED) shows the message in the modal, no sign-out', async () => {
    mockGetSignInMethods.mockResolvedValue(linked('google'));
    mockReauth.mockRejectedValueOnce(apiError(403, 'REAUTH_FAILED', 'We could not confirm it is you.'));
    setup(jest.fn());
    fireEvent.press(screen.getByTestId('run'));
    const googleButton = await screen.findByTestId('reauth-google-button');
    await act(async () => {
      fireEvent.press(googleButton);
    });
    expect(await screen.findByText('We could not confirm it is you.')).toBeTruthy();
    expect(mockLogout).not.toHaveBeenCalled();
  });

  describe('Android fallback (ADR 0012): no linked provider this device shows', () => {
    beforeEach(() => {
      mockGoogleConfigured = false; // Google off on Android
      mockAppleAvailable = false; // never on Android
    });

    it.each([
      ['Apple-only', linked('apple')],
      ['Google while it is off', linked('google')],
    ])('%s: `unavailable`, no prompt, nothing sent', async (_l, methods) => {
      mockGetSignInMethods.mockResolvedValue(methods);
      const action = jest.fn();
      setup(action);
      await act(async () => {
        fireEvent.press(screen.getByTestId('run'));
      });
      await waitFor(() => expect(lastResult()).toEqual({ status: 'unavailable' }));
      expect(screen.queryByText(i18n.t('auth.reauth.title'))).toBeNull();
      expect(action).not.toHaveBeenCalled();
      expect(mockReauth).not.toHaveBeenCalled();
    });

    it('setting-gated route: the call goes without a token (the setting is off)', async () => {
      mockGetSignInMethods.mockResolvedValue(linked('apple'));
      const action = jest.fn().mockResolvedValue('deleted');
      setup(action, { gated: true });
      await act(async () => {
        fireEvent.press(screen.getByTestId('run'));
      });
      await waitFor(() => expect(lastResult()).toEqual({ status: 'done', value: 'deleted' }));
      expect(action).toHaveBeenCalledWith(undefined);
    });

    it('setting-gated route while the setting is on: explains and offers the set-password mail', async () => {
      mockGetSignInMethods.mockResolvedValue(linked('apple'));
      const action = jest.fn().mockRejectedValue(apiError(403, 'REAUTH_REQUIRED'));
      setup(action, { gated: true });
      await act(async () => {
        fireEvent.press(screen.getByTestId('run'));
      });
      await waitFor(() => expect(lastResult()).toEqual({ status: 'cancelled' }));
      expect(action).toHaveBeenCalledTimes(1);
      const [title, message, buttons] = (appAlert as jest.Mock).mock.calls[0]!;
      expect(title).toBe(i18n.t('auth.reauth.title'));
      // The server's localised REAUTH_REQUIRED message, why this device cannot confirm, and the
      // one way out: a password by mail.
      expect(message).toBe(`server says no\n\n${i18n.t('mobile.noPasswordAccountNoProvider')}`);
      await act(async () => {
        buttons.find((b: { text: string }) => b.text === i18n.t('auth.setPassword')).onPress();
      });
      expect(mockForgotPassword).toHaveBeenCalledWith('me@ornek.com');
    });
  });

  it('the sign-in methods route is missing (404, an API before the step-up): `unavailable`, the gated call goes without a token', async () => {
    mockGetSignInMethods.mockRejectedValue(apiError(404));
    const action = jest.fn().mockResolvedValue('ok');
    setup(action, { gated: true });
    await act(async () => {
      fireEvent.press(screen.getByTestId('run'));
    });
    await waitFor(() => expect(lastResult()).toEqual({ status: 'done', value: 'ok' }));
    expect(action).toHaveBeenCalledWith(undefined);
  });

  it('the sign-in methods cannot be read (5xx/network): the error and a retry, never a guess', async () => {
    const down = apiError(500, undefined, 'Server error');
    mockGetSignInMethods.mockRejectedValueOnce(down).mockResolvedValue(withPassword);
    const action = jest.fn().mockResolvedValue('ok');
    setup(action, { gated: true });
    await act(async () => {
      fireEvent.press(screen.getByTestId('run'));
    });
    expect(await screen.findByText('Server error')).toBeTruthy();
    expect(action).not.toHaveBeenCalled();
    expect(mockCapture).toHaveBeenCalledWith(down, expect.objectContaining({ level: 'error' }));

    await act(async () => {
      fireEvent.press(screen.getByTestId('reauth-retry'));
    });
    await confirmPassword();
    await waitFor(() => expect(lastResult()).toEqual({ status: 'done', value: 'ok' }));
    expect(action).toHaveBeenCalledWith(TOKEN_1);
  });

  it('400 REAUTH_METHOD_NOT_ALLOWED (a password was set elsewhere): re-reads the methods and asks for the password', async () => {
    mockGetSignInMethods.mockResolvedValueOnce(linked('google')).mockResolvedValue(withPassword);
    mockReauth
      .mockRejectedValueOnce(apiError(400, 'REAUTH_METHOD_NOT_ALLOWED', 'Confirm with your password.'))
      .mockResolvedValueOnce(ok(TOKEN_2));
    const action = jest.fn().mockResolvedValue('ok');
    setup(action);
    fireEvent.press(screen.getByTestId('run'));
    const googleButton = await screen.findByTestId('reauth-google-button');
    await act(async () => {
      fireEvent.press(googleButton);
    });

    expect(await screen.findByText('Confirm with your password.')).toBeTruthy();
    expect(screen.queryByTestId('reauth-google-button')).toBeNull();
    await confirmPassword();
    await waitFor(() => expect(lastResult()).toEqual({ status: 'done', value: 'ok' }));
    expect(action).toHaveBeenCalledWith(TOKEN_2);
  });

  it('Google DEVELOPER_ERROR shows a plain Google failure line, reported; not the raw native text', async () => {
    mockGetSignInMethods.mockResolvedValue(linked('google'));
    const nativeError = Object.assign(new Error('DEVELOPER_ERROR: Follow troubleshooting'), { code: '10' });
    mockSignInWithGoogle.mockRejectedValueOnce(nativeError);
    setup(jest.fn());
    fireEvent.press(screen.getByTestId('run'));
    const googleButton = await screen.findByTestId('reauth-google-button');
    await act(async () => {
      fireEvent.press(googleButton);
    });
    expect(await screen.findByText(i18n.t('auth.googleSignInFailed'))).toBeTruthy();
    expect(screen.queryByText(/DEVELOPER_ERROR/)).toBeNull();
    expect(mockCapture).toHaveBeenCalledWith(nativeError, expect.objectContaining({ level: 'error' }));
  });
});

describe('re-reads', () => {
  it('a REAUTH_REQUIRED retry whose methods re-read fails keeps the known methods (password field, no load error)', async () => {
    mockGetSignInMethods.mockResolvedValueOnce(withPassword).mockRejectedValue(apiError(500, undefined, 'Server error'));
    mockReauth.mockResolvedValueOnce(ok(TOKEN_1)).mockResolvedValueOnce(ok(TOKEN_2));
    const action = jest.fn().mockRejectedValueOnce(apiError(403, 'REAUTH_REQUIRED')).mockResolvedValueOnce('ok');
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    renderWithProviders(<Harness action={action} />, { queryClient });
    fireEvent.press(screen.getByTestId('run'));
    await confirmPassword();
    await confirmPassword();
    await waitFor(() => expect(lastResult()).toEqual({ status: 'done', value: 'ok' }));
    expect(screen.queryByText('Server error')).toBeNull();
    expect(action.mock.calls).toEqual([[TOKEN_1], [TOKEN_2]]);
  });
});

describe('token lifetime and sharing (web parity)', () => {
  afterEach(() => jest.restoreAllMocks());

  it('reused until 15 s before expiresAt, then asked again', async () => {
    const now = Date.parse('2026-10-21T10:00:00.000Z');
    const clock = jest.spyOn(Date, 'now').mockReturnValue(now);
    mockReauth
      .mockResolvedValueOnce({ data: { reauthToken: TOKEN_1, expiresAt: new Date(Date.now() + 300_000).toISOString() } })
      .mockResolvedValueOnce({ data: { reauthToken: TOKEN_2, expiresAt: '2026-10-21T10:10:00.000Z' } });
    const action = jest.fn().mockResolvedValue('ok');
    setup(action);
    fireEvent.press(screen.getByTestId('run'));
    await confirmPassword();
    await waitFor(() => expect(results).toHaveLength(1));

    clock.mockReturnValue(now + 5 * 60_000 - REAUTH_EXPIRY_MARGIN_MS - 1);
    await act(async () => {
      fireEvent.press(screen.getByTestId('run'));
    });
    await waitFor(() => expect(results).toHaveLength(2));
    expect(action).toHaveBeenNthCalledWith(2, TOKEN_1);

    clock.mockReturnValue(now + 5 * 60_000 - REAUTH_EXPIRY_MARGIN_MS);
    fireEvent.press(screen.getByTestId('run'));
    await confirmPassword();
    await waitFor(() => expect(results).toHaveLength(3));
    expect(action).toHaveBeenNthCalledWith(3, TOKEN_2);
    expect(mockReauth).toHaveBeenCalledTimes(2);
  });

  it('an unreadable expiresAt is used for that call only, never cached', async () => {
    mockReauth.mockResolvedValue({ data: { reauthToken: TOKEN_1, expiresAt: 'not a date' } });
    const action = jest.fn().mockResolvedValue('ok');
    setup(action);
    fireEvent.press(screen.getByTestId('run'));
    await confirmPassword();
    await waitFor(() => expect(results).toHaveLength(1));
    fireEvent.press(screen.getByTestId('run'));
    expect(await screen.findByTestId('reauth-password-input')).toBeTruthy();
  });

  it('two calls asking at once share one confirm step', async () => {
    const action = jest.fn().mockResolvedValue('ok');
    setup(action);
    fireEvent.press(screen.getByTestId('run'));
    fireEvent.press(screen.getByTestId('run'));
    await confirmPassword();
    await waitFor(() => expect(results).toHaveLength(2));
    expect(results).toEqual([{ status: 'done', value: 'ok' }, { status: 'done', value: 'ok' }]);
    expect(mockReauth).toHaveBeenCalledTimes(1);
  });

  it('a proof that lands after the screen is gone is never kept or used', async () => {
    let answer!: (v: unknown) => void;
    mockReauth.mockReturnValueOnce(new Promise((r) => (answer = r)));
    const action = jest.fn();
    const { unmount } = setup(action);
    fireEvent.press(screen.getByTestId('run'));
    await confirmPassword();
    unmount();
    await act(async () => answer(ok(TOKEN_1)));
    await waitFor(() => expect(lastResult()).toEqual({ status: 'cancelled' }));
    expect(action).not.toHaveBeenCalled();
  });
});

describe('the token is memory only', () => {
  it('never written to SecureStore or AsyncStorage, not in the query cache, gone from the mutation cache after unmount', async () => {
    const setItem = jest.spyOn(AsyncStorage, 'setItem');
    const action = jest.fn().mockResolvedValue('ok');
    const { queryClient, unmount } = setup(action);
    fireEvent.press(screen.getByTestId('run'));
    await confirmPassword();
    await waitFor(() => expect(results).toHaveLength(1));

    const writes = [
      ...(SecureStore.setItemAsync as jest.Mock).mock.calls,
      ...setItem.mock.calls,
    ].map((call) => JSON.stringify(call));
    expect(writes.join('\n')).not.toContain(TOKEN_1);
    const queries = queryClient.getQueryCache().getAll().map((q) => JSON.stringify(q.state.data));
    expect(queries.join('\n')).not.toContain(TOKEN_1);

    unmount();
    // `gcTime: 0` drops the finished mutation on the next tick once nothing observes it.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
    const mutations = queryClient.getMutationCache().getAll().map((m) => JSON.stringify(m.state));
    expect(mutations.join('\n')).not.toContain(TOKEN_1);
  });
});
