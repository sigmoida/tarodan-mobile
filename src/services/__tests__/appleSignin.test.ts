/**
 * B-2.5 · Apple girişi `authorizationCode`'u da göndersin (sunucu Apple token
 * iptali için; Apple 5.1.1(v)).
 */
jest.mock('expo-apple-authentication', () => ({
  signInAsync: jest.fn(),
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
}));

jest.mock('@/lib/api/client', () => ({
  api: { post: jest.fn(() => Promise.resolve({ data: {} })) },
  guestApi: { post: jest.fn(), get: jest.fn() },
}));

import * as AppleAuthentication from 'expo-apple-authentication';
import { api } from '@/lib/api/client';
import { authApi } from '@/lib/api/auth';
import { signInWithApple } from '../appleSignin';

const mockSignInAsync = AppleAuthentication.signInAsync as jest.Mock;
const mockPost = api.post as jest.Mock;

describe('B-2.5 · Apple ile giriş', () => {
  beforeEach(() => {
    mockSignInAsync.mockReset();
    mockPost.mockClear();
  });

  it('signInWithApple authorizationCode, identityToken ve adı döndürür', async () => {
    mockSignInAsync.mockResolvedValue({
      identityToken: 'id-token',
      authorizationCode: 'auth-code',
      fullName: { givenName: 'Ayşe', familyName: 'Yılmaz' },
    });
    await expect(signInWithApple()).resolves.toEqual({
      identityToken: 'id-token',
      authorizationCode: 'auth-code',
      fullName: 'Ayşe Yılmaz',
    });
  });

  it('POST /auth/apple gövdesi authorizationCode taşır', async () => {
    await authApi.loginWithApple({
      identityToken: 'id-token',
      fullName: 'Ayşe Yılmaz',
      authorizationCode: 'auth-code',
    });
    expect(mockPost).toHaveBeenCalledWith('/auth/apple', {
      identityToken: 'id-token',
      fullName: 'Ayşe Yılmaz',
      authorizationCode: 'auth-code',
    });
  });

  it('kod gelmezse alan gönderilmez', async () => {
    mockSignInAsync.mockResolvedValue({ identityToken: 'id-token', authorizationCode: null, fullName: null });
    const credential = await signInWithApple();
    await authApi.loginWithApple(credential);
    const body = mockPost.mock.calls[0][1];
    expect(body).not.toHaveProperty('authorizationCode');
    expect(body.identityToken).toBe('id-token');
  });
});
