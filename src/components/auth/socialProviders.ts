import { isGoogleConfigured } from '@/services/googleSignin';
import type { useSocialSignIn } from '@/hooks/useSocialSignIn';
import type { SignInMethods, SignInProvider } from '@/types/sign-in-methods';

export interface VisibleSocialProviders {
  google: boolean;
  apple: boolean;
  /** At least one provider button is rendered. */
  any: boolean;
}

/**
 * Which provider buttons `SocialButtons` renders. Single source of truth for the buttons
 * and for the copy around them (the "or" divider, the terms notice): on a platform with
 * no provider (Android while Google is off, an iOS device without Apple) that copy must
 * not mention or separate buttons that are not there.
 */
export function getVisibleSocialProviders(
  social: Pick<ReturnType<typeof useSocialSignIn>, 'appleAvailable'>,
): VisibleSocialProviders {
  const google = isGoogleConfigured();
  const apple = social.appleAvailable;
  return { google, apple, any: google || apple };
}

/**
 * Providers that can confirm "it's you" (step-up) on this device: linked to the account AND
 * shown here (`getVisibleSocialProviders`; Apple is iOS-only per ADR 0012, Google on Android
 * follows its build flag). Only meaningful for an account without a password: an account with
 * one confirms with the password only. Empty means the device cannot confirm, so the Android
 * fallback (the set-password mail) applies. Order follows the link order of the API.
 */
export function confirmableProviders(
  methods: Pick<SignInMethods, 'providers'>,
  visible: Pick<VisibleSocialProviders, 'google' | 'apple'>,
): SignInProvider[] {
  const linked = methods.providers.map((p) => p.provider).filter((p) => visible[p]);
  return linked.filter((p, i) => linked.indexOf(p) === i);
}

/** Brand names, never translated (`src/i18n/CLAUDE.md` › Proper names). */
export const SIGN_IN_PROVIDER_NAMES: Record<SignInProvider, string> = {
  google: 'Google',
  apple: 'Apple',
};

/** Can this account confirm "it's you" on this device (password, or a provider shown here)? */
export function canConfirmOnDevice(
  methods: SignInMethods,
  visible: Pick<VisibleSocialProviders, 'google' | 'apple'>,
): boolean {
  return methods.hasPassword || confirmableProviders(methods, visible).length > 0;
}
