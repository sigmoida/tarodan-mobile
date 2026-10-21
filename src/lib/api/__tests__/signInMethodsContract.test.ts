/**
 * Contract fixtures for the sign-in methods and step-up routes mobile calls (tarodan-ops
 * `contracts/deltas/2026-10-21-sign-in-methods-step-up-and-connected-accounts.md`).
 *
 * The bodies below are copied from the delta (the API is not on staging yet, so they are not
 * measured). The test pins: the request shapes mobile sends (URL, method, body, the
 * `X-Reauth-Token` header on DELETE, `idToken` only for Google), that the vendored types and
 * error codes match the delta, and that the error helpers read the documented bodies.
 */
jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), push: jest.fn(), back: jest.fn() },
}));
jest.mock('@/stores/authStore', () => {
  const { create } = jest.requireActual<typeof import('zustand')>('zustand');
  return { useAuthStore: create(() => ({ isAuthenticated: true, token: 'a1', logout: jest.fn() })) };
});

import * as SecureStore from 'expo-secure-store';
import type { InternalAxiosRequestConfig } from 'axios';
import { api } from '../client';
import { authApi } from '../auth';
import { userApi } from '../user';
import { isReauthRequired, signInMethodsErrorCode } from '../reauthError';
import {
  REAUTH_TOKEN_HEADER,
  SIGN_IN_METHODS_ERROR_CODES,
  SIGN_IN_PROVIDERS,
  canUnlinkProvider,
  type SignInMethods,
} from '@/types/sign-in-methods';

/** `GET /auth/sign-in-methods` (delta, Shapes). */
const SIGN_IN_METHODS_FIXTURE: SignInMethods = {
  hasPassword: false,
  providers: [
    { provider: 'apple', email: 'abc@privaterelay.appleid.com', linkedAt: '2026-10-01T08:00:00.000Z' },
    { provider: 'google', email: null, linkedAt: '2026-10-02T08:00:00.000Z' },
  ],
};
/** `POST /auth/reauth` 200 (delta, Step-up rules: 43-char base64url token). */
const REAUTH_FIXTURE = {
  reauthToken: 'Zm9vYmFyYmF6cXV4cXV1eGNvcmdlZ3JhdWx0Z2FycGx5',
  expiresAt: '2026-10-21T10:05:00.000Z',
};
/** Error body (delta, Errors): `{ statusCode, message, error, i18nKey, errorCode }`. */
const errorBody = (statusCode: number, errorCode: string, i18nKey: string) => ({
  statusCode,
  message: 'localised',
  error: 'Forbidden',
  i18nKey,
  errorCode,
});

const sent: { url?: string; method?: string; headers: Record<string, unknown>; data: unknown }[] = [];
let nextReply: unknown = {};

beforeEach(() => {
  sent.length = 0;
  nextReply = {};
  (SecureStore.getItemAsync as jest.Mock).mockImplementation(async () => 'a1');
  api.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    sent.push({
      url: config.url,
      method: config.method,
      headers: { ...(config.headers as Record<string, unknown>) },
      data: typeof config.data === 'string' ? JSON.parse(config.data) : config.data,
    });
    return { status: 200, data: nextReply, headers: {}, config, statusText: '' };
  };
});

describe('request shapes', () => {
  it('GET /auth/sign-in-methods answers SignInMethods', async () => {
    nextReply = SIGN_IN_METHODS_FIXTURE;
    const res = await authApi.getSignInMethods();
    expect(sent[0]).toMatchObject({ url: '/auth/sign-in-methods', method: 'get' });
    expect(res.data).toEqual(SIGN_IN_METHODS_FIXTURE);
  });

  it('POST /auth/reauth: password as typed; Google `idToken` only (never `code`); Apple `identityToken`', async () => {
    nextReply = REAUTH_FIXTURE;
    await authApi.reauth({ password: ' Secret123 ' });
    await authApi.reauth({ provider: 'google', idToken: 'g-id' });
    await authApi.reauth({ provider: 'apple', identityToken: 'a-id' });
    expect(sent.map((r) => [r.method, r.url, r.data])).toEqual([
      ['post', '/auth/reauth', { password: ' Secret123 ' }],
      ['post', '/auth/reauth', { provider: 'google', idToken: 'g-id' }],
      ['post', '/auth/reauth', { provider: 'apple', identityToken: 'a-id' }],
    ]);
  });

  it('POST /auth/password/set carries the token in the body', async () => {
    nextReply = { ...SIGN_IN_METHODS_FIXTURE, hasPassword: true };
    const res = await authApi.setPassword({ newPassword: 'Secret123', reauthToken: 'tok' });
    expect(sent[0]).toMatchObject({
      url: '/auth/password/set',
      method: 'post',
      data: { newPassword: 'Secret123', reauthToken: 'tok' },
    });
    expect(res.data.hasPassword).toBe(true);
  });

  it('DELETE /users/me: the token goes in the X-Reauth-Token header, no body; none without a token', async () => {
    await userApi.deleteAccount('tok');
    await userApi.deleteAccount();
    expect(sent[0]).toMatchObject({ url: '/users/me', method: 'delete' });
    expect(sent[0]!.headers[REAUTH_TOKEN_HEADER]).toBe('tok');
    expect(sent[0]!.data).toBeUndefined();
    expect(sent[1]!.headers[REAUTH_TOKEN_HEADER]).toBeUndefined();
  });

  it('POST /auth/email/request-change: `reauthToken` in the body only when there is one (1.0.5 shape otherwise)', async () => {
    await authApi.requestEmailChange('n@ornek.com', 'tok');
    await authApi.requestEmailChange('n@ornek.com');
    expect(sent[0]!.data).toEqual({ newEmail: 'n@ornek.com', reauthToken: 'tok' });
    expect(sent[1]!.data).toEqual({ newEmail: 'n@ornek.com' });
    expect(sent[0]!.headers[REAUTH_TOKEN_HEADER]).toBeUndefined();
  });
});

describe('vendored types match the delta', () => {
  it('providers, header and error codes', () => {
    expect(SIGN_IN_PROVIDERS).toEqual(['google', 'apple']);
    expect(REAUTH_TOKEN_HEADER).toBe('x-reauth-token');
    expect(SIGN_IN_METHODS_ERROR_CODES).toEqual({
      reauthRequired: 'REAUTH_REQUIRED',
      reauthFailed: 'REAUTH_FAILED',
      reauthMethodNotAllowed: 'REAUTH_METHOD_NOT_ALLOWED',
      reauthLocked: 'REAUTH_LOCKED',
      reauthUnavailable: 'REAUTH_UNAVAILABLE',
      passwordAlreadySet: 'PASSWORD_ALREADY_SET',
      providerTokenInvalid: 'PROVIDER_TOKEN_INVALID',
      providerAlreadyLinked: 'PROVIDER_ALREADY_LINKED',
      providerLinkedToOtherAccount: 'PROVIDER_LINKED_TO_OTHER_ACCOUNT',
      providerNotLinked: 'PROVIDER_NOT_LINKED',
      lastSignInMethod: 'LAST_SIGN_IN_METHOD',
    });
  });

  it('the last-method rule (D1): a password or a Google link must remain; Apple alone does not count', () => {
    expect(canUnlinkProvider(SIGN_IN_METHODS_FIXTURE, 'apple')).toBe(true);
    expect(canUnlinkProvider(SIGN_IN_METHODS_FIXTURE, 'google')).toBe(false);
    expect(canUnlinkProvider({ ...SIGN_IN_METHODS_FIXTURE, hasPassword: true }, 'google')).toBe(true);
  });
});

describe('error bodies', () => {
  const asError = (status: number, data: unknown) => ({ isAxiosError: true, response: { status, data } });

  it.each([
    [403, 'REAUTH_REQUIRED', 'server.auth.reauthRequired'],
    [403, 'REAUTH_FAILED', 'server.auth.reauthFailed'],
    [400, 'REAUTH_METHOD_NOT_ALLOWED', 'server.auth.reauthMethodNotAllowed'],
    [429, 'REAUTH_LOCKED', 'server.auth.reauthLocked'],
    [503, 'REAUTH_UNAVAILABLE', 'server.auth.reauthUnavailable'],
    [409, 'PASSWORD_ALREADY_SET', 'server.auth.passwordAlreadySet'],
  ])('%i %s is read from errorCode', (status, code, key) => {
    const e = asError(status, errorBody(status, code, key));
    expect(signInMethodsErrorCode(e)).toBe(code);
    expect(isReauthRequired(e)).toBe(code === 'REAUTH_REQUIRED');
  });

  it('a throttle 429 has no errorCode and is not the per-user lockout', () => {
    const e = asError(429, { statusCode: 429, message: 'ThrottlerException: Too Many Requests' });
    expect(signInMethodsErrorCode(e)).toBeNull();
  });
});
