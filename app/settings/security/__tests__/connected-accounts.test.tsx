/**
 * Connected accounts (web `ConnectedAccountsSection`, sign-in methods delta 2026-10-21, ADR 0012):
 *
 * - rows per platform: iOS offers Connect for both; Android never offers Apple Connect (hint
 *   `appleIosOnly`) and, while Google is off there, shows `googleUnavailableAndroid` in place of
 *   Connect; a linked provider always shows its status and Disconnect;
 * - D1: Disconnect is disabled with the hint when `canUnlinkProvider` is false;
 * - Connect: the confirm step first, then the provider's sheet, then the link at once (Apple's
 *   one-time `authorizationCode` stays fresh; Google sends the `idToken` only); Disconnect: the confirmation with the D2
 *   re-link note, then the confirm step, then the unlink;
 * - the answer updates the list without a reload; 404/409 refusals re-read the methods;
 * - nothing signs out; only 5xx/network reach Sentry; no token or credential stays in a cache.
 */
import React from 'react';
import { Platform } from 'react-native';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { appAlert, toast } from '@/ui';
import { renderWithProviders } from '@/test-utils';
import { resetRouterMocks } from '@/test-utils/router-mock';
import { expectCachesFreeOf } from '@/test-utils/cacheSecrets';
import i18n from '@/i18n/config';
import type { MessageKey } from '@/i18n/lib/generated/keys';

jest.mock('expo-router', () => jest.requireActual('@/test-utils/router-mock').routerMock);
jest.mock('@/ui', () => {
  const actual = jest.requireActual('@/ui');
  const { confirmWith } = jest.requireActual('@/ui/components/AlertDialog');
  const appAlert = jest.fn();
  return {
    ...actual,
    appAlert,
    confirm: (options: unknown) => confirmWith(appAlert, options),
    // The real helper waits for the close animation; the order is what matters here.
    runAfterModalClose: (next: () => void) => next(),
    toast: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn(), dismiss: jest.fn() }),
  };
});
const mockLogout = jest.fn();
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (s: Record<string, unknown>) => unknown) => {
    const state = { isAuthenticated: true, user: { id: 'u1', email: 'me@ornek.com' }, logout: mockLogout };
    return sel ? sel(state) : state;
  },
}));

const mockGetSignInMethods = jest.fn();
const mockReauth = jest.fn();
const mockLinkGoogle = jest.fn();
const mockLinkApple = jest.fn();
const mockUnlink = jest.fn();
const mockForgotPassword = jest.fn((_email: string) => Promise.resolve({ data: {} }));
jest.mock('@/lib/api', () => ({
  authApi: {
    getSignInMethods: () => mockGetSignInMethods(),
    reauth: (proof: unknown) => mockReauth(proof),
    linkGoogle: (body: unknown) => mockLinkGoogle(body),
    linkApple: (body: unknown) => mockLinkApple(body),
    unlinkProvider: (provider: unknown, body: unknown) => mockUnlink(provider, body),
    forgotPassword: (email: string) => mockForgotPassword(email),
  },
}));
let mockGoogleConfigured = true;
const mockSignInWithGoogle = jest.fn();
jest.mock('@/services/googleSignin', () => ({
  isGoogleConfigured: () => mockGoogleConfigured,
  signInWithGoogle: (opts: unknown) => mockSignInWithGoogle(opts),
}));
let mockAppleAvailable = true;
const mockSignInWithApple = jest.fn();
jest.mock('@/services/appleSignin', () => ({
  isAppleAvailable: () => Promise.resolve(mockAppleAvailable),
  signInWithApple: () => mockSignInWithApple(),
}));
const mockCapture = jest.fn();
jest.mock('@/services/sentry', () => ({ captureException: (...a: unknown[]) => mockCapture(...a) }));

import ConnectedAccountsScreen from '../connected-accounts';

type Provider = 'google' | 'apple';
const methods = (hasPassword: boolean, ...providers: Provider[]) => ({
  hasPassword,
  providers: providers.map((provider, i) => ({
    provider,
    email: provider === 'google' ? 'me@gmail.com' : null,
    linkedAt: `2026-10-0${i + 1}T00:00:00.000Z`,
  })),
});
const answer = (data: unknown) => ({ data });
/** A write that the server keeps: the refetch after it reads the same state. */
const writes = (next: ReturnType<typeof methods>) => async () => {
  mockGetSignInMethods.mockResolvedValue(answer(next));
  return answer(next);
};
const ok = (reauthToken: string) => answer({ reauthToken, expiresAt: new Date(Date.now() + 300_000).toISOString() });
const apiError = (status: number, errorCode?: string, message = 'server says no') => ({
  isAxiosError: true,
  response: { status, data: { statusCode: status, message, errorCode } },
});
const t = (key: MessageKey, args: Record<string, unknown> = {}) => i18n.t(key, args);
const alertMock = appAlert as jest.Mock;

const originalOS = Platform.OS;
function setPlatform(os: 'ios' | 'android') {
  Platform.OS = os;
}

beforeEach(() => {
  jest.clearAllMocks();
  resetRouterMocks();
  setPlatform('ios');
  mockGoogleConfigured = true;
  mockAppleAvailable = true;
  mockGetSignInMethods.mockResolvedValue(answer(methods(true)));
  mockReauth.mockResolvedValue(ok('tok-1'));
  mockSignInWithGoogle.mockResolvedValue('google-id-token');
  mockSignInWithApple.mockResolvedValue({ identityToken: 'apple-id-token', authorizationCode: 'apple-code' });
  mockLinkGoogle.mockImplementation(writes(methods(true, 'google')));
  mockLinkApple.mockImplementation(writes(methods(true, 'apple')));
  mockUnlink.mockImplementation(writes(methods(true)));
});

afterAll(() => {
  Platform.OS = originalOS;
});

const row = (provider: Provider) => screen.getByTestId(`connected-${provider}-row`);

async function renderScreen() {
  const utils = renderWithProviders(<ConnectedAccountsScreen />);
  await screen.findByTestId('connected-google-row');
  // Let the async Apple availability check land.
  await act(() => Promise.resolve());
  return utils;
}

async function confirmPassword(password = 'Secret123') {
  fireEvent.changeText(await screen.findByTestId('reauth-password-input'), password);
  await act(async () => {
    fireEvent.press(screen.getByTestId('reauth-confirm'));
  });
}

/** Answer the last `appAlert` (the disconnect confirmation) with the button of `style`. */
async function answerAlert(style: 'destructive' | 'cancel') {
  await waitFor(() => expect(alertMock).toHaveBeenCalled());
  const buttons = alertMock.mock.calls[alertMock.mock.calls.length - 1]![2] as {
    style?: string;
    onPress?: () => void;
  }[];
  await act(async () => {
    buttons.find((b) => b.style === style)!.onPress?.();
  });
}

describe('rows per platform', () => {
  it('iOS, password account, nothing linked: both providers offer Connect, no hint', async () => {
    await renderScreen();
    for (const provider of ['google', 'apple'] as const) {
      expect(within(row(provider)).getByText(t('profile.connectedAccounts.notConnected'))).toBeTruthy();
      expect(screen.getByTestId(`connected-${provider}-connect`)).toBeEnabled();
      expect(screen.queryByTestId(`connected-${provider}-hint`)).toBeNull();
    }
    expect(screen.getByText(t('profile.connectedAccounts.description'))).toBeTruthy();
  });

  it('a linked provider shows Connected, its e-mail and Disconnect', async () => {
    mockGetSignInMethods.mockResolvedValue(answer(methods(true, 'google')));
    await renderScreen();
    expect(within(row('google')).getByText(t('profile.connectedAccounts.connected'))).toBeTruthy();
    expect(
      within(row('google')).getByText(t('profile.connectedAccounts.connectedAs', { email: 'me@gmail.com' })),
    ).toBeTruthy();
    expect(screen.getByTestId('connected-google-disconnect')).toBeEnabled();
    expect(screen.queryByTestId('connected-google-connect')).toBeNull();
  });

  it('Android with Google off: hints in place of Connect for both, never an Apple Connect', async () => {
    setPlatform('android');
    mockGoogleConfigured = false;
    mockAppleAvailable = false;
    await renderScreen();
    expect(screen.queryByTestId('connected-google-connect')).toBeNull();
    expect(screen.queryByTestId('connected-apple-connect')).toBeNull();
    expect(screen.getByTestId('connected-google-hint')).toHaveTextContent(
      t('mobile.connectedAccounts.googleUnavailableAndroid'),
    );
    expect(screen.getByTestId('connected-apple-hint')).toHaveTextContent(t('mobile.connectedAccounts.appleIosOnly'));
  });

  it('Android with Google on: Google offers Connect, Apple keeps the iOS-only hint', async () => {
    setPlatform('android');
    mockAppleAvailable = false;
    await renderScreen();
    expect(screen.getByTestId('connected-google-connect')).toBeEnabled();
    expect(screen.queryByTestId('connected-apple-connect')).toBeNull();
    expect(screen.getByTestId('connected-apple-hint')).toHaveTextContent(t('mobile.connectedAccounts.appleIosOnly'));
  });

  it('Android, both linked: status and Disconnect for both (Apple too), no Connect', async () => {
    setPlatform('android');
    mockGoogleConfigured = false;
    mockAppleAvailable = false;
    mockGetSignInMethods.mockResolvedValue(answer(methods(true, 'google', 'apple')));
    await renderScreen();
    expect(screen.getByTestId('connected-apple-disconnect')).toBeEnabled();
    expect(screen.getByTestId('connected-google-disconnect')).toBeEnabled();
    expect(within(row('apple')).getByText(t('profile.connectedAccounts.connected'))).toBeTruthy();
    expect(screen.queryByTestId('connected-apple-hint')).toBeNull();
    expect(screen.queryByTestId('connected-google-hint')).toBeNull();
  });

  it('iOS: the Apple row is there from the first rendered row (no pop-in after the async check)', async () => {
    let resolveApple!: (v: boolean) => void;
    const appleSignin = jest.requireMock('@/services/appleSignin') as { isAppleAvailable: () => Promise<boolean> };
    const original = appleSignin.isAppleAvailable;
    appleSignin.isAppleAvailable = () => new Promise((r) => (resolveApple = r));
    try {
      renderWithProviders(<ConnectedAccountsScreen />);
      await act(() => Promise.resolve());
      expect(screen.queryByTestId('connected-google-row')).toBeNull();
      await act(async () => resolveApple(true));
      expect(await screen.findByTestId('connected-google-row')).toBeTruthy();
      expect(screen.getByTestId('connected-apple-row')).toBeTruthy();
    } finally {
      appleSignin.isAppleAvailable = original;
    }
  });

  it('iOS build without the Google client: a Google that is not linked has no row (web parity)', async () => {
    mockGoogleConfigured = false;
    renderWithProviders(<ConnectedAccountsScreen />);
    await screen.findByTestId('connected-apple-row');
    expect(screen.queryByTestId('connected-google-row')).toBeNull();
  });

  it('the methods cannot be read: the error and a retry that reads them again', async () => {
    mockGetSignInMethods.mockRejectedValueOnce(apiError(500)).mockResolvedValue(answer(methods(true)));
    renderWithProviders(<ConnectedAccountsScreen />);
    const error = await screen.findByTestId('error-state');
    fireEvent.press(within(error).getByText(t('mobile.errorRetry')));
    expect(await screen.findByTestId('connected-google-row')).toBeTruthy();
    expect(mockGetSignInMethods).toHaveBeenCalledTimes(2);
  });
});

describe('last-method rule (D1)', () => {
  it('no password, Google only: Disconnect Google is disabled with the hint', async () => {
    mockGetSignInMethods.mockResolvedValue(answer(methods(false, 'google')));
    await renderScreen();
    expect(screen.getByTestId('connected-google-disconnect')).toBeDisabled();
    expect(screen.getByTestId('connected-google-hint')).toHaveTextContent(
      t('profile.connectedAccounts.lastMethodHint'),
    );
  });

  it('no password, Google and Apple: Apple can go, Google cannot (Apple alone does not count)', async () => {
    mockGetSignInMethods.mockResolvedValue(answer(methods(false, 'google', 'apple')));
    await renderScreen();
    expect(screen.getByTestId('connected-apple-disconnect')).toBeEnabled();
    expect(screen.queryByTestId('connected-apple-hint')).toBeNull();
    expect(screen.getByTestId('connected-google-disconnect')).toBeDisabled();
    expect(screen.getByTestId('connected-google-hint')).toHaveTextContent(
      t('profile.connectedAccounts.lastMethodHint'),
    );
  });

  it('a password keeps every Disconnect enabled', async () => {
    mockGetSignInMethods.mockResolvedValue(answer(methods(true, 'google', 'apple')));
    await renderScreen();
    expect(screen.getByTestId('connected-google-disconnect')).toBeEnabled();
    expect(screen.getByTestId('connected-apple-disconnect')).toBeEnabled();
  });
});

describe('connect', () => {
  it('Apple on iOS: the confirm step first, then the sheet, then the link with authorizationCode', async () => {
    let resolveSheet!: (v: unknown) => void;
    mockSignInWithApple.mockReturnValueOnce(new Promise((r) => (resolveSheet = r)));
    // The refetch after the write never answers: only the written answer can update the row.
    mockLinkApple.mockImplementationOnce(async () => {
      mockGetSignInMethods.mockReturnValue(new Promise(() => undefined));
      return answer(methods(true, 'apple'));
    });
    await renderScreen();
    fireEvent.press(screen.getByTestId('connected-apple-connect'));

    // The confirm step comes first: no sheet under the modal.
    await screen.findByTestId('reauth-password-input');
    expect(mockSignInWithApple).not.toHaveBeenCalled();
    expect(screen.getByTestId('connected-google-connect')).toBeDisabled();
    await confirmPassword('Secret123');
    expect(mockReauth).toHaveBeenCalledWith({ password: 'Secret123' });

    // Then the sheet, with the modal gone; nothing is linked until it answers.
    await waitFor(() => expect(mockSignInWithApple).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId('reauth-password-input')).toBeNull();
    expect(mockLinkApple).not.toHaveBeenCalled();
    await act(async () => {
      resolveSheet({ identityToken: 'apple-id-token', authorizationCode: 'apple-code' });
    });

    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(mockLinkApple).toHaveBeenCalledWith({
      identityToken: 'apple-id-token',
      authorizationCode: 'apple-code',
      reauthToken: 'tok-1',
    });
    expect(toast.success).toHaveBeenCalledWith(t('profile.connectedAccounts.connectSuccess', { provider: 'Apple' }));
    // The answer updates the list without a reload.
    await waitFor(() =>
      expect(within(row('apple')).getByText(t('profile.connectedAccounts.connected'))).toBeTruthy(),
    );
    expect(screen.getByTestId('connected-apple-disconnect')).toBeEnabled();
  });

  it('Google: the chooser always shows (fresh) and only the idToken is sent', async () => {
    await renderScreen();
    fireEvent.press(screen.getByTestId('connected-google-connect'));
    await confirmPassword();
    await waitFor(() => expect(mockLinkGoogle).toHaveBeenCalled());
    expect(mockSignInWithGoogle).toHaveBeenCalledWith({ fresh: true });
    expect(mockLinkGoogle).toHaveBeenCalledWith({ idToken: 'google-id-token', reauthToken: 'tok-1' });
    await waitFor(() => expect(screen.getByTestId('connected-google-disconnect')).toBeTruthy());
  });

  it('no password: confirms with a linked provider shown here, then links the other one', async () => {
    mockGetSignInMethods.mockResolvedValue(answer(methods(false, 'google')));
    mockLinkApple.mockImplementation(writes(methods(false, 'google', 'apple')));
    await renderScreen();
    fireEvent.press(screen.getByTestId('connected-apple-connect'));
    const confirmGoogle = await screen.findByTestId('reauth-google-button');
    await act(async () => {
      fireEvent.press(confirmGoogle);
    });
    await waitFor(() => expect(mockLinkApple).toHaveBeenCalled());
    expect(mockReauth).toHaveBeenCalledWith({ provider: 'google', idToken: 'google-id-token' });
    // The confirming Google sheet first, the Apple sheet to link after it.
    expect(mockSignInWithGoogle.mock.invocationCallOrder[0]).toBeLessThan(
      mockSignInWithApple.mock.invocationCallOrder[0]!,
    );
  });

  it('closing the provider sheet links nothing, says nothing, and keeps the step-up for the next try', async () => {
    mockSignInWithApple.mockRejectedValueOnce(Object.assign(new Error('x'), { code: 'ERR_REQUEST_CANCELED' }));
    await renderScreen();
    fireEvent.press(screen.getByTestId('connected-apple-connect'));
    await confirmPassword();
    await waitFor(() => expect(screen.getByTestId('connected-apple-connect')).toBeEnabled());
    expect(mockLinkApple).not.toHaveBeenCalled();
    // The next try asks for no second confirm step.
    fireEvent.press(screen.getByTestId('connected-apple-connect'));
    await waitFor(() => expect(mockLinkApple).toHaveBeenCalled());
    expect(mockReauth).toHaveBeenCalledTimes(1);
    expect(toast.error).not.toHaveBeenCalled();
    expect(mockCapture).not.toHaveBeenCalled();
  });

  it('Google DEVELOPER_ERROR: the plain failure line and a Sentry report, nothing sent', async () => {
    const devError = Object.assign(new Error('DEVELOPER_ERROR: Follow troubleshooting'), { code: '10' });
    mockSignInWithGoogle.mockRejectedValueOnce(devError);
    await renderScreen();
    fireEvent.press(screen.getByTestId('connected-google-connect'));
    await confirmPassword();
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(t('auth.googleSignInFailed')));
    expect(mockCapture).toHaveBeenCalledWith(devError, {
      level: 'error',
      tags: { flow: 'auth.provider_link', provider: 'google', reason: 'developer_error' },
    });
    expect(mockLinkGoogle).not.toHaveBeenCalled();
  });

  it('a credential older than the reuse window is asked for again on the REAUTH_REQUIRED retry', async () => {
    const now = jest.spyOn(Date, 'now');
    let clock = Date.parse('2026-10-21T10:00:00.000Z');
    now.mockImplementation(() => clock);
    mockReauth.mockImplementation(async () =>
      answer({ reauthToken: `tok-${mockReauth.mock.calls.length}`, expiresAt: new Date(clock + 300_000).toISOString() }),
    );
    mockLinkApple.mockImplementationOnce(async () => {
      clock += 5 * 60_000; // the user took long on the second confirm step
      throw apiError(403, 'REAUTH_REQUIRED');
    });
    mockSignInWithApple
      .mockResolvedValueOnce({ identityToken: 'apple-id-1', authorizationCode: 'code-1' })
      .mockResolvedValueOnce({ identityToken: 'apple-id-2', authorizationCode: 'code-2' });
    try {
      await renderScreen();
      fireEvent.press(screen.getByTestId('connected-apple-connect'));
      await confirmPassword();
      await confirmPassword();
      await waitFor(() => expect(toast.success).toHaveBeenCalled());
      expect(mockLinkApple.mock.calls.map(([b]) => [b.authorizationCode, b.reauthToken])).toEqual([
        ['code-1', 'tok-1'],
        ['code-2', 'tok-2'],
      ]);
    } finally {
      now.mockRestore();
    }
  });

  it('a fault that is no API answer: the plain line (never its text) and a Sentry report', async () => {
    const fault = new Error('The operation couldn\u2019t be completed');
    mockLinkApple.mockRejectedValueOnce(fault);
    await renderScreen();
    fireEvent.press(screen.getByTestId('connected-apple-connect'));
    await confirmPassword();
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(t('common.operationFailed')));
    expect(mockCapture).toHaveBeenCalledWith(fault, {
      level: 'error',
      tags: { flow: 'auth.provider_link', provider: 'apple' },
    });
  });

  it('cancelling the confirm step opens no sheet, links nothing and frees the row', async () => {
    await renderScreen();
    fireEvent.press(screen.getByTestId('connected-apple-connect'));
    fireEvent.press(await screen.findByTestId('reauth-cancel'));
    await waitFor(() => expect(screen.getByTestId('connected-apple-connect')).toBeEnabled());
    expect(mockSignInWithApple).not.toHaveBeenCalled();
    expect(mockLinkApple).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('the step-up token expired: confirm again once and retry with the same credential', async () => {
    mockLinkApple.mockRejectedValueOnce(apiError(403, 'REAUTH_REQUIRED'));
    mockReauth.mockResolvedValueOnce(ok('tok-1')).mockResolvedValueOnce(ok('tok-2'));
    await renderScreen();
    fireEvent.press(screen.getByTestId('connected-apple-connect'));
    await confirmPassword();
    await confirmPassword();
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(mockSignInWithApple).toHaveBeenCalledTimes(1);
    expect(mockLinkApple.mock.calls.map(([b]) => b.reauthToken)).toEqual(['tok-1', 'tok-2']);
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it.each([
    [409, 'PROVIDER_LINKED_TO_OTHER_ACCOUNT', 'This Google or Apple account is connected to another Tarodan account.'],
    [409, 'PROVIDER_ALREADY_LINKED', 'This sign-in method is already connected.'],
  ])('%i %s: the server message, the methods are read again, no sign-out', async (status, code, message) => {
    mockLinkApple.mockRejectedValueOnce(apiError(status, code, message));
    await renderScreen();
    const reads = mockGetSignInMethods.mock.calls.length;
    fireEvent.press(screen.getByTestId('connected-apple-connect'));
    await confirmPassword();
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(message));
    await waitFor(() => expect(mockGetSignInMethods.mock.calls.length).toBeGreaterThan(reads));
    expect(toast.success).not.toHaveBeenCalled();
    expect(mockCapture).not.toHaveBeenCalled();
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it('a 400 PROVIDER_TOKEN_INVALID shows the server message and does not re-read the list', async () => {
    mockLinkGoogle.mockRejectedValueOnce(apiError(400, 'PROVIDER_TOKEN_INVALID', 'Google session invalid'));
    await renderScreen();
    const reads = mockGetSignInMethods.mock.calls.length;
    fireEvent.press(screen.getByTestId('connected-google-connect'));
    await confirmPassword();
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Google session invalid'));
    expect(mockGetSignInMethods.mock.calls.length).toBe(reads);
    expect(mockCapture).not.toHaveBeenCalled();
  });

  it('a 5xx on link: toast and a Sentry report tagged with the flow and provider', async () => {
    const down = apiError(503);
    mockLinkApple.mockRejectedValueOnce(down);
    await renderScreen();
    fireEvent.press(screen.getByTestId('connected-apple-connect'));
    await confirmPassword();
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(mockCapture).toHaveBeenCalledWith(down, {
      level: 'error',
      tags: { flow: 'auth.provider_link', provider: 'apple' },
    });
  });

  it('a double tap opens one sheet and links once', async () => {
    await renderScreen();
    fireEvent.press(screen.getByTestId('connected-apple-connect'));
    fireEvent.press(screen.getByTestId('connected-apple-connect'));
    await confirmPassword();
    await waitFor(() => expect(toast.success).toHaveBeenCalledTimes(1));
    expect(mockSignInWithApple).toHaveBeenCalledTimes(1);
    expect(mockLinkApple).toHaveBeenCalledTimes(1);
  });

  it('Android, no password and no linked provider shown here: told why, the mail offered, no sheet', async () => {
    setPlatform('android');
    mockAppleAvailable = false;
    mockGetSignInMethods.mockResolvedValue(answer(methods(false, 'apple')));
    await renderScreen();
    fireEvent.press(screen.getByTestId('connected-google-connect'));
    await waitFor(() => expect(alertMock).toHaveBeenCalled());
    const [title, message, buttons] = alertMock.mock.calls[0]!;
    expect(title).toBe(t('auth.reauth.title'));
    expect(message).toContain(t('mobile.noPasswordAccountNoProvider'));
    expect(mockSignInWithGoogle).not.toHaveBeenCalled();
    await act(async () => {
      (buttons as { text: string; onPress?: () => void }[]).find((b) => b.text === t('auth.setPassword'))!.onPress?.();
    });
    await waitFor(() => expect(mockForgotPassword).toHaveBeenCalledWith('me@ornek.com'));
  });
});

describe('disconnect', () => {
  beforeEach(() => {
    mockGetSignInMethods.mockResolvedValue(answer(methods(true, 'google', 'apple')));
  });

  it('the confirmation names the provider and the re-link note, then the confirm step, then the unlink', async () => {
    mockUnlink.mockImplementation(writes(methods(true, 'google')));
    await renderScreen();
    fireEvent.press(screen.getByTestId('connected-apple-disconnect'));
    await waitFor(() => expect(alertMock).toHaveBeenCalled());
    const [title, message] = alertMock.mock.calls[0]!;
    expect(title).toBe(t('profile.connectedAccounts.disconnectTitle', { provider: 'Apple' }));
    expect(message).toBe(
      `${t('profile.connectedAccounts.disconnectConfirm', { provider: 'Apple' })}\n\n${t(
        'profile.connectedAccounts.relinkNote',
        { provider: 'Apple' },
      )}`,
    );
    // No step-up before the user agreed.
    expect(mockReauth).not.toHaveBeenCalled();
    await answerAlert('destructive');

    await confirmPassword();
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(mockUnlink).toHaveBeenCalledWith('apple', { reauthToken: 'tok-1' });
    expect(toast.success).toHaveBeenCalledWith(t('profile.connectedAccounts.disconnectSuccess', { provider: 'Apple' }));
    await waitFor(() =>
      expect(within(row('apple')).getByText(t('profile.connectedAccounts.notConnected'))).toBeTruthy(),
    );
  });

  it('cancelling the confirmation asks for nothing and sends nothing; the rows wait meanwhile', async () => {
    await renderScreen();
    fireEvent.press(screen.getByTestId('connected-google-disconnect'));
    await waitFor(() => expect(alertMock).toHaveBeenCalled());
    expect(screen.getByTestId('connected-apple-disconnect')).toBeDisabled();
    await answerAlert('cancel');
    await waitFor(() => expect(screen.getByTestId('connected-apple-disconnect')).toBeEnabled());
    expect(screen.queryByTestId('reauth-password-input')).toBeNull();
    expect(mockReauth).not.toHaveBeenCalled();
    expect(mockUnlink).not.toHaveBeenCalled();
  });

  it('409 LAST_SIGN_IN_METHOD race: the D1 text, the list is read again and Disconnect turns off', async () => {
    const lastMethod = t('profile.connectedAccounts.lastMethodHint');
    mockGetSignInMethods
      .mockResolvedValueOnce(answer(methods(false, 'google', 'apple')))
      .mockResolvedValue(answer(methods(false, 'google')));
    mockUnlink.mockRejectedValueOnce(apiError(409, 'LAST_SIGN_IN_METHOD', lastMethod));
    await renderScreen();
    fireEvent.press(screen.getByTestId('connected-apple-disconnect'));
    await answerAlert('destructive');
    await act(async () => {
      fireEvent.press(await screen.findByTestId('reauth-google-button'));
    });
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(lastMethod));
    await waitFor(() => expect(screen.getByTestId('connected-google-disconnect')).toBeDisabled());
    expect(screen.getByTestId('connected-google-hint')).toHaveTextContent(lastMethod);
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it('404 PROVIDER_NOT_LINKED (a stale list): the message and the list is read again', async () => {
    mockGetSignInMethods
      .mockResolvedValueOnce(answer(methods(true, 'google', 'apple')))
      .mockResolvedValue(answer(methods(true, 'google')));
    mockUnlink.mockRejectedValueOnce(apiError(404, 'PROVIDER_NOT_LINKED', 'not connected'));
    await renderScreen();
    fireEvent.press(screen.getByTestId('connected-apple-disconnect'));
    await answerAlert('destructive');
    await confirmPassword();
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('not connected'));
    await waitFor(() => expect(screen.getByTestId('connected-apple-connect')).toBeTruthy());
    expect(mockCapture).not.toHaveBeenCalled();
  });

  it('a network failure on unlink: toast and a Sentry report tagged with the flow and provider', async () => {
    const offline = { isAxiosError: true, code: 'ERR_NETWORK', message: 'Network Error' };
    mockUnlink.mockRejectedValueOnce(offline);
    await renderScreen();
    fireEvent.press(screen.getByTestId('connected-google-disconnect'));
    await answerAlert('destructive');
    await confirmPassword();
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(t('common.operationFailed')));
    expect(mockCapture).toHaveBeenCalledWith(offline, {
      level: 'error',
      tags: { flow: 'auth.provider_unlink', provider: 'google' },
    });
  });

  it('the token is reused for a second write within its life (one confirm step)', async () => {
    mockUnlink.mockImplementation(writes(methods(true, 'google')));
    await renderScreen();
    fireEvent.press(screen.getByTestId('connected-apple-disconnect'));
    await answerAlert('destructive');
    await confirmPassword();
    await waitFor(() => expect(mockUnlink).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByTestId('connected-apple-connect')).toBeEnabled());

    fireEvent.press(screen.getByTestId('connected-apple-connect'));
    await waitFor(() => expect(mockLinkApple).toHaveBeenCalled());
    expect(mockReauth).toHaveBeenCalledTimes(1);
    expect(mockLinkApple.mock.calls[0]![0].reauthToken).toBe('tok-1');
  });
});

describe('secrets', () => {
  it('the step-up token, the password and the provider credential leave the caches with the screen', async () => {
    const { queryClient, unmount } = await renderScreen();
    fireEvent.press(screen.getByTestId('connected-apple-connect'));
    await confirmPassword('Secret123');
    await waitFor(() => expect(mockLinkApple).toHaveBeenCalled());
    await waitFor(() => expect(toast.success).toHaveBeenCalled());

    await expectCachesFreeOf(queryClient, unmount, ['tok-1', 'Secret123', 'apple-id-token', 'apple-code']);
  });
});
