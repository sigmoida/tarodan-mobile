/**
 * Step-up answers never end the session (sign-in methods delta 2026-10-21, mobile P1).
 *
 * The API answers every step-up problem without a 401: `403 REAUTH_REQUIRED`,
 * `403 REAUTH_FAILED`, `400 REAUTH_METHOD_NOT_ALLOWED`, `429 REAUTH_LOCKED`,
 * `503 REAUTH_UNAVAILABLE`, `400 PROVIDER_TOKEN_INVALID`, `409 PASSWORD_ALREADY_SET`, and the
 * Connected accounts refusals (`409 PROVIDER_ALREADY_LINKED`, `409 PROVIDER_LINKED_TO_OTHER_ACCOUNT`,
 * `403 EMAIL_NOT_VERIFIED`, `404 PROVIDER_NOT_LINKED`, `409 LAST_SIGN_IN_METHOD`). The response
 * interceptor of `client.ts` must hand each one to the caller as is: one request, no refresh, no
 * sign-out, no redirect. Only a real 401 keeps its refresh path, the link and unlink routes
 * included (they are not public auth routes).
 *
 * Drives the REAL axios instance and its interceptor chain; only the adapter is fake.
 */
jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), push: jest.fn(), back: jest.fn() },
}));
jest.mock('@/stores/authStore', () => {
  const { create } = jest.requireActual<typeof import('zustand')>('zustand');
  return {
    useAuthStore: create(() => ({
      isAuthenticated: true,
      token: 'a1',
      logout: jest.fn(async () => undefined),
    })),
  };
});

import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { axios } from '@/lib/api-client';
import { useAuthStore } from '@/stores/authStore';
import type { InternalAxiosRequestConfig } from 'axios';
import { api } from '../client';
import { authApi } from '../auth';
import { userApi } from '../user';
import { isReauthRequired } from '../reauthError';

type CaughtError = { response: { status: number; data: Record<string, unknown> } };
const caught = (p: Promise<unknown>) =>
  p.then(
    () => {
      throw new Error('the request succeeded');
    },
    (e: CaughtError) => e,
  );
const logoutMock = () => (useAuthStore.getState() as unknown as { logout: jest.Mock }).logout;

type Reply = { status: number; data: unknown };
let replies: Reply[] = [];
const sent: { url?: string; method?: string; headers: Record<string, unknown>; data?: unknown }[] = [];

beforeEach(() => {
  jest.restoreAllMocks();
  (router.replace as jest.Mock).mockClear();
  useAuthStore.setState({ token: 'a1', logout: jest.fn(async () => undefined) });
  sent.length = 0;
  replies = [];
  (SecureStore.getItemAsync as jest.Mock).mockImplementation(async (k: string) =>
    k === 'refreshToken' ? 'r1' : 'a1',
  );
  api.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    sent.push({
      url: config.url,
      method: config.method,
      headers: { ...(config.headers as Record<string, unknown>) },
      data: typeof config.data === 'string' ? JSON.parse(config.data) : config.data,
    });
    const reply = replies.shift() ?? { status: 200, data: {} };
    if (reply.status < 400) return { status: reply.status, data: reply.data, headers: {}, config, statusText: '' };
    throw Object.assign(new Error(`Request failed with status code ${reply.status}`), {
      isAxiosError: true,
      config,
      response: { status: reply.status, data: reply.data, headers: {}, config },
    });
  };
});

const body = (statusCode: number, errorCode: string, i18nKey: string) => ({
  status: statusCode,
  data: { statusCode, message: 'localised', error: 'x', i18nKey, errorCode },
});

const STEP_UP_ANSWERS: [string, Reply][] = [
  ['403 REAUTH_REQUIRED', body(403, 'REAUTH_REQUIRED', 'server.auth.reauthRequired')],
  ['403 REAUTH_FAILED', body(403, 'REAUTH_FAILED', 'server.auth.reauthFailed')],
  ['400 REAUTH_METHOD_NOT_ALLOWED', body(400, 'REAUTH_METHOD_NOT_ALLOWED', 'server.auth.reauthMethodNotAllowed')],
  ['429 REAUTH_LOCKED', body(429, 'REAUTH_LOCKED', 'server.auth.reauthLocked')],
  ['503 REAUTH_UNAVAILABLE', body(503, 'REAUTH_UNAVAILABLE', 'server.auth.reauthUnavailable')],
  ['400 PROVIDER_TOKEN_INVALID', body(400, 'PROVIDER_TOKEN_INVALID', 'server.auth.googleSessionInvalid')],
  ['409 PASSWORD_ALREADY_SET', body(409, 'PASSWORD_ALREADY_SET', 'server.auth.passwordAlreadySet')],
];

const CALLS: [string, () => Promise<unknown>][] = [
  ['POST /auth/reauth', () => authApi.reauth({ password: 'Secret123' })],
  ['POST /auth/password/set', () => authApi.setPassword({ newPassword: 'Secret123', reauthToken: 'tok' })],
  ['DELETE /users/me', () => userApi.deleteAccount('tok')],
  ['POST /auth/email/request-change', () => authApi.requestEmailChange('n@ornek.com', 'tok')],
  ['POST /auth/social/google/link', () => authApi.linkGoogle({ idToken: 'g-id', reauthToken: 'tok' })],
  [
    'POST /auth/social/apple/link',
    () => authApi.linkApple({ identityToken: 'a-id', authorizationCode: 'a-code', reauthToken: 'tok' }),
  ],
  ['POST /auth/social/apple/unlink', () => authApi.unlinkProvider('apple', { reauthToken: 'tok' })],
];

/** The refusals of the Connected accounts routes (contract delta 2026-10-21, "Errors"). */
const CONNECTED_ACCOUNTS_ANSWERS: [string, () => Promise<unknown>, Reply][] = [
  [
    'link 409 PROVIDER_ALREADY_LINKED',
    () => authApi.linkGoogle({ idToken: 'g-id', reauthToken: 'tok' }),
    body(409, 'PROVIDER_ALREADY_LINKED', 'server.auth.providerAlreadyLinked'),
  ],
  [
    'link 409 PROVIDER_LINKED_TO_OTHER_ACCOUNT',
    () => authApi.linkApple({ identityToken: 'a-id', reauthToken: 'tok' }),
    body(409, 'PROVIDER_LINKED_TO_OTHER_ACCOUNT', 'server.auth.providerLinkedToOtherAccount'),
  ],
  [
    'link 403 EMAIL_NOT_VERIFIED',
    () => authApi.linkGoogle({ idToken: 'g-id', reauthToken: 'tok' }),
    body(403, 'EMAIL_NOT_VERIFIED', 'server.auth.emailNotVerifiedLogin'),
  ],
  [
    'unlink 404 PROVIDER_NOT_LINKED',
    () => authApi.unlinkProvider('google', { reauthToken: 'tok' }),
    body(404, 'PROVIDER_NOT_LINKED', 'server.auth.providerNotLinked'),
  ],
  [
    'unlink 409 LAST_SIGN_IN_METHOD',
    () => authApi.unlinkProvider('google', { reauthToken: 'tok' }),
    body(409, 'LAST_SIGN_IN_METHOD', 'server.auth.lastSignInMethod'),
  ],
];

describe.each(CALLS)('%s', (_name, call) => {
  it.each(STEP_UP_ANSWERS)('%s: one request, no refresh, no sign-out, no redirect', async (_label, reply) => {
    const refresh = jest.spyOn(axios, 'post');
    replies = [reply];

    const e = await caught(call());

    expect(e.response.status).toBe(reply.status);
    expect(e.response.data.errorCode).toBe((reply.data as { errorCode: string }).errorCode);
    expect(sent).toHaveLength(1);
    expect(refresh).not.toHaveBeenCalled();
    expect(logoutMock()).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });
});

it.each(CONNECTED_ACCOUNTS_ANSWERS)('%s: one request, no refresh, no sign-out, no redirect', async (_l, call, reply) => {
  const refresh = jest.spyOn(axios, 'post');
  replies = [reply];

  const e = await caught(call());

  expect(e.response.status).toBe(reply.status);
  expect(sent).toHaveLength(1);
  expect(refresh).not.toHaveBeenCalled();
  expect(logoutMock()).not.toHaveBeenCalled();
  expect(router.replace).not.toHaveBeenCalled();
});

it('a stale access token on a link refreshes once and replays the same body (not a public route)', async () => {
  const refresh = jest.spyOn(axios, 'post').mockResolvedValueOnce({ data: { accessToken: 'a2', refreshToken: 'r2' } });
  replies = [
    { status: 401, data: { statusCode: 401, i18nKey: 'server.auth.loginRequired' } },
    { status: 200, data: { hasPassword: true, providers: [] } },
  ];

  await authApi.linkApple({ identityToken: 'a-id', authorizationCode: 'a-code', reauthToken: 'tok' });

  expect(refresh).toHaveBeenCalledTimes(1);
  expect(sent).toHaveLength(2);
  expect(sent[1]!.data).toEqual({ identityToken: 'a-id', authorizationCode: 'a-code', reauthToken: 'tok' });
  expect(logoutMock()).not.toHaveBeenCalled();
});

it('a REAUTH_REQUIRED answer is recognised for the one retry; other 403s are not', async () => {
  replies = [body(403, 'REAUTH_REQUIRED', 'server.auth.reauthRequired')];
  expect(isReauthRequired(await caught(userApi.deleteAccount('tok')))).toBe(true);
  replies = [body(403, 'REAUTH_FAILED', 'server.auth.reauthFailed')];
  expect(isReauthRequired(await caught(authApi.reauth({ password: 'x' })))).toBe(false);
  replies = [{ status: 403, data: { statusCode: 403, errorCode: 'USER_BANNED' } }];
  expect(isReauthRequired(await caught(userApi.deleteAccount('tok')))).toBe(false);
});

it('a stale access token on the step-up still refreshes once and replays with the same proof', async () => {
  jest.spyOn(axios, 'post').mockResolvedValueOnce({ data: { accessToken: 'a2', refreshToken: 'r2' } });
  replies = [
    { status: 401, data: { statusCode: 401, i18nKey: 'server.auth.loginRequired' } },
    { status: 200, data: { reauthToken: 'tok', expiresAt: '2026-10-21T10:05:00.000Z' } },
  ];

  const res = await authApi.reauth({ password: 'Secret123' });

  expect(res.data.reauthToken).toBe('tok');
  expect(sent).toHaveLength(2);
  expect(sent[1]!.data).toEqual({ password: 'Secret123' });
  expect(logoutMock()).not.toHaveBeenCalled();
});
