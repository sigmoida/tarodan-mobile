/**
 * The user closed the Apple sheet: `expo-apple-authentication` rejects with this code. Kept
 * free of the native module import so any caller (and jest) can load it.
 */
export const APPLE_SIGN_IN_CANCELLED = 'ERR_REQUEST_CANCELED';

export function isAppleCancel(error: unknown): boolean {
  return (error as { code?: unknown } | null | undefined)?.code === APPLE_SIGN_IN_CANCELLED;
}
