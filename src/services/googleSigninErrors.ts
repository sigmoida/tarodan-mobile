/**
 * Native `GoogleSignin.signIn()` rejects with `code: '10'` and a message starting with
 * `DEVELOPER_ERROR: Follow troubleshooting instructions at <url>` when the Android OAuth
 * client (package name + signing SHA-1) is missing or does not match the installed build
 * (docs/ANDROID_RELEASE.md, section 9). It is a build/configuration fault, not a user
 * mistake, so it is shown as a plain message and reported to Sentry.
 *
 * Kept free of the native module import so any caller (and jest) can load it.
 */
export const GOOGLE_DEVELOPER_ERROR_CODE = '10';

export function isGoogleDeveloperError(error: unknown): boolean {
  const e = error as { code?: unknown; message?: unknown } | null | undefined;
  return (
    String(e?.code ?? '') === GOOGLE_DEVELOPER_ERROR_CODE ||
    (typeof e?.message === 'string' && e.message.includes('DEVELOPER_ERROR'))
  );
}

/**
 * The user closed the Google sheet. `signInWithGoogle` rethrows the SDK's `{ type: 'cancelled' }`
 * answer as `SIGN_IN_CANCELLED`; older SDKs rejected with that code or iOS `-5`.
 */
export const GOOGLE_SIGN_IN_CANCELLED = 'SIGN_IN_CANCELLED';

export function isGoogleCancel(error: unknown): boolean {
  const code = String((error as { code?: unknown } | null | undefined)?.code ?? '');
  return code === GOOGLE_SIGN_IN_CANCELLED || code === '-5';
}
