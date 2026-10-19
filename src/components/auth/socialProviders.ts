import { isGoogleConfigured } from '@/services/googleSignin';
import type { useSocialSignIn } from '@/hooks/useSocialSignIn';

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
  { apple = true }: { apple?: boolean } = {},
): VisibleSocialProviders {
  const google = isGoogleConfigured();
  const showApple = apple && social.appleAvailable;
  return { google, apple: showApple, any: google || showApple };
}
