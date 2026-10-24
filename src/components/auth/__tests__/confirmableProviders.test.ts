/**
 * Which linked providers can confirm "it's you" on this device (ADR 0012: Apple is iOS-only,
 * Google on Android follows its build flag). Empty means the Android set-password-mail fallback.
 */
jest.mock('@/services/googleSignin', () => ({ isGoogleConfigured: () => false }));
import { canConfirmOnDevice, confirmableProviders } from '../socialProviders';
import type { SignInMethods } from '@/types/sign-in-methods';

const methods = (hasPassword: boolean, ...providers: ('google' | 'apple')[]): SignInMethods => ({
  hasPassword,
  providers: providers.map((provider) => ({ provider, email: null, linkedAt: '2026-10-01T00:00:00.000Z' })),
});
const IOS_BOTH = { google: true, apple: true };
const ANDROID_GOOGLE_ON = { google: true, apple: false };
const ANDROID_GOOGLE_OFF = { google: false, apple: false };

it.each([
  ['iOS, both linked', methods(false, 'apple', 'google'), IOS_BOTH, ['apple', 'google']],
  ['Android, both linked, Google on', methods(false, 'apple', 'google'), ANDROID_GOOGLE_ON, ['google']],
  ['Android, Apple only', methods(false, 'apple'), ANDROID_GOOGLE_ON, []],
  ['Android, Google only, Google off', methods(false, 'google'), ANDROID_GOOGLE_OFF, []],
  ['nothing linked', methods(false), IOS_BOTH, []],
] as const)('%s', (_label, m, visible, expected) => {
  expect(confirmableProviders(m, visible)).toEqual(expected);
});

it('a password always confirms, on any device', () => {
  expect(canConfirmOnDevice(methods(true), ANDROID_GOOGLE_OFF)).toBe(true);
  expect(canConfirmOnDevice(methods(false, 'apple'), ANDROID_GOOGLE_OFF)).toBe(false);
  expect(canConfirmOnDevice(methods(false, 'apple'), IOS_BOTH)).toBe(true);
});
