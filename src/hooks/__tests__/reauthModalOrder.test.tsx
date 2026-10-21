/**
 * The confirm step and the iOS modal rule (`src/ui/CLAUDE.md` › iOS modal rule): a native layer
 * (the Google / Apple sheet, the reopened confirm step) is presented only after the modal has
 * closed, and the modal never waits open for the proof request.
 *
 * `runAfterModalClose` is a queue here, not the real timer: each test flushes it by hand, so a
 * call that skips it (presenting while the modal still animates out) runs early and fails.
 */
import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Button } from '@/ui';
import { renderWithProviders } from '@/test-utils';
import { ReauthModal } from '@/components/auth/ReauthModal';
import i18n from '@/i18n/config';

const mockAfterClose: (() => void)[] = [];
jest.mock('expo-router', () => jest.requireActual('@/test-utils/router-mock').routerMock);
jest.mock('@/ui', () => ({
  ...jest.requireActual('@/ui'),
  appAlert: jest.fn(),
  runAfterModalClose: (next: () => void) => {
    mockAfterClose.push(next);
  },
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
jest.mock('@/lib/api', () => ({
  authApi: {
    getSignInMethods: () => mockGetSignInMethods(),
    reauth: (proof: unknown) => mockReauth(proof),
    forgotPassword: jest.fn(),
  },
}));
const mockSignInWithGoogle = jest.fn();
jest.mock('@/services/googleSignin', () => ({
  isGoogleConfigured: () => true,
  signInWithGoogle: (opts: unknown) => mockSignInWithGoogle(opts),
}));
jest.mock('@/services/appleSignin', () => ({
  isAppleAvailable: () => Promise.resolve(false),
  signInWithApple: jest.fn(),
}));
const mockCapture = jest.fn();
jest.mock('@/services/sentry', () => ({
  captureException: (...args: unknown[]) => mockCapture(...args),
}));

import { useReauth, type ReauthOutcome } from '../useReauth';

const TOKEN_1 = 'step-up-token-1-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const TOKEN_2 = 'step-up-token-2-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const ok = (reauthToken: string) => ({
  data: { reauthToken, expiresAt: new Date(Date.now() + 300_000).toISOString() },
});
const withPassword = { data: { hasPassword: true, providers: [] } };
const googleOnly = {
  data: { hasPassword: false, providers: [{ provider: 'google', email: null, linkedAt: '2026-10-01T00:00:00.000Z' }] },
};

let results: ReauthOutcome<unknown>[] = [];

function Harness({ action }: { action: jest.Mock }) {
  const reauth = useReauth('email_change');
  return (
    <>
      <Button testID="run" title="run" onPress={async () => results.push(await reauth.run(action))} />
      <ReauthModal {...reauth.modal} />
    </>
  );
}

/** Let the modal finish closing: run what waited for it. */
async function flushAfterClose() {
  await act(async () => {
    while (mockAfterClose.length) await mockAfterClose.shift()!();
  });
}

async function typePasswordAndConfirm() {
  fireEvent.changeText(await screen.findByTestId('reauth-password-input'), 'Secret123');
  await act(async () => {
    fireEvent.press(screen.getByTestId('reauth-confirm'));
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAfterClose.length = 0;
  results = [];
  mockGetSignInMethods.mockResolvedValue(withPassword);
  mockReauth.mockResolvedValue(ok(TOKEN_1));
  mockSignInWithGoogle.mockResolvedValue('google-id-token');
});

it('Google: the native sheet opens only after the confirm step has closed', async () => {
  mockGetSignInMethods.mockResolvedValue(googleOnly);
  const action = jest.fn().mockResolvedValue('ok');
  renderWithProviders(<Harness action={action} />);
  fireEvent.press(screen.getByTestId('run'));
  const googleButton = await screen.findByTestId('reauth-google-button');

  await act(async () => {
    fireEvent.press(googleButton);
  });

  // The modal is gone and the sheet waits for its close animation.
  expect(screen.queryByTestId('reauth-google-button')).toBeNull();
  expect(screen.queryByText(i18n.t('auth.reauth.title'))).toBeNull();
  expect(mockSignInWithGoogle).not.toHaveBeenCalled();

  await flushAfterClose();

  await waitFor(() => expect(results).toEqual([{ status: 'done', value: 'ok' }]));
  expect(mockSignInWithGoogle).toHaveBeenCalledWith({ fresh: true });
  expect(action).toHaveBeenCalledWith(TOKEN_1);
});

it('password: the modal is closed while the proof is checked (it never waits on the request)', async () => {
  let answer!: (v: unknown) => void;
  mockReauth.mockReturnValueOnce(new Promise((resolve) => (answer = resolve)));
  const action = jest.fn().mockResolvedValue('ok');
  renderWithProviders(<Harness action={action} />);
  fireEvent.press(screen.getByTestId('run'));
  await typePasswordAndConfirm();

  expect(mockReauth).toHaveBeenCalledWith({ password: 'Secret123' });
  expect(screen.queryByTestId('reauth-password-input')).toBeNull();
  expect(action).not.toHaveBeenCalled();

  await act(async () => answer(ok(TOKEN_1)));

  await waitFor(() => expect(results).toEqual([{ status: 'done', value: 'ok' }]));
  expect(action).toHaveBeenCalledWith(TOKEN_1);
});

it('a wrong proof reopens the step only after the close, with the message inside it', async () => {
  mockReauth.mockRejectedValueOnce({
    isAxiosError: true,
    response: { status: 403, data: { statusCode: 403, message: 'We could not confirm it is you.', errorCode: 'REAUTH_FAILED' } },
  });
  renderWithProviders(<Harness action={jest.fn()} />);
  fireEvent.press(screen.getByTestId('run'));
  await typePasswordAndConfirm();

  expect(screen.queryByTestId('reauth-password-input')).toBeNull();
  expect(mockAfterClose).toHaveLength(1);

  await flushAfterClose();

  expect(await screen.findByText('We could not confirm it is you.')).toBeTruthy();
  expect(screen.getByTestId('reauth-password-input')).toBeTruthy();
  expect(mockLogout).not.toHaveBeenCalled();
});

it('403 REAUTH_REQUIRED right after a confirm: the step reopens only after the close animation', async () => {
  mockReauth.mockResolvedValueOnce(ok(TOKEN_1)).mockResolvedValueOnce(ok(TOKEN_2));
  const action = jest
    .fn()
    .mockRejectedValueOnce({ isAxiosError: true, response: { status: 403, data: { statusCode: 403, errorCode: 'REAUTH_REQUIRED' } } })
    .mockResolvedValueOnce('ok');
  renderWithProviders(<Harness action={action} />);
  fireEvent.press(screen.getByTestId('run'));
  await typePasswordAndConfirm();

  await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
  // The first modal has only just closed: the second one waits for it.
  await waitFor(() => expect(mockAfterClose).toHaveLength(1));
  expect(screen.queryByTestId('reauth-password-input')).toBeNull();

  await flushAfterClose();
  await typePasswordAndConfirm();

  await waitFor(() => expect(results).toEqual([{ status: 'done', value: 'ok' }]));
  expect(action.mock.calls).toEqual([[TOKEN_1], [TOKEN_2]]);
});

it('no answer (network): the step reopens with the generic message, reported, no sign-out', async () => {
  const offline = { isAxiosError: true, code: 'ERR_NETWORK', message: 'Network Error' };
  mockReauth.mockRejectedValueOnce(offline);
  const action = jest.fn();
  renderWithProviders(<Harness action={action} />);
  fireEvent.press(screen.getByTestId('run'));
  await typePasswordAndConfirm();
  await flushAfterClose();

  expect(await screen.findByText(i18n.t('error.somethingWrongDesc'))).toBeTruthy();
  expect(screen.getByTestId('reauth-password-input')).toBeTruthy();
  expect(screen.queryByText('Network Error')).toBeNull();
  expect(action).not.toHaveBeenCalled();
  expect(mockLogout).not.toHaveBeenCalled();
  expect(mockCapture).toHaveBeenCalledWith(offline, {
    level: 'error',
    tags: { flow: 'auth.reauth', reauthFor: 'email_change', method: 'password' },
  });
});
