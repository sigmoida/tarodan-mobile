import { signInWithGoogle } from '@/services/googleSignin';
import { isGoogleCancel } from '@/services/googleSigninErrors';
import { signInWithApple } from '@/services/appleSignin';
import { isAppleCancel } from '@/services/appleSigninErrors';
import type { SignInProvider } from '@/types/sign-in-methods';

/**
 * A fresh provider sign-in for the account area (the step-up and Connected accounts), in the
 * shape the step-up and link routes take (web `ProviderCredential`). Native Google gives an
 * `idToken`; Apple gives an `identityToken` and, for a link, the one-time `authorizationCode`.
 * Kept in memory by the caller only, never persisted.
 */
export type ProviderCredential =
  | { provider: 'google'; idToken: string }
  | { provider: 'apple'; identityToken: string; authorizationCode?: string };

/**
 * Open the provider's native sheet. Google signs its SDK out first (`fresh`), so the account
 * chooser always shows and the `idToken` is new (the step-up refuses an `iat` older than 300 s;
 * a link lets the user pick which Google account to connect). Rejects on a cancel too: tell it
 * apart with `isProviderCancel`.
 */
export async function requestProviderCredential(provider: SignInProvider): Promise<ProviderCredential> {
  if (provider === 'google') {
    return { provider, idToken: await signInWithGoogle({ fresh: true }) };
  }
  const { identityToken, authorizationCode } = await signInWithApple();
  return { provider, identityToken, ...(authorizationCode ? { authorizationCode } : {}) };
}

/** The user closed the provider's sheet: show nothing, report nothing. */
export function isProviderCancel(provider: SignInProvider, error: unknown): boolean {
  return provider === 'google' ? isGoogleCancel(error) : isAppleCancel(error);
}
