import i18n from '@/i18n/config';
import { authApi } from '@/lib/api';
import { useAppMutation } from '@/lib/query';
import { toast } from '@/ui';

/**
 * "Set a password" by e-mail: sends the reset link (`POST /auth/forgot-password`) to the given
 * address. One action for the login step of an account without a password and for the
 * signed-in fallback when this device cannot confirm it's you (an Apple-only account on
 * Android, or Google while it is off there; ADR 0012). After the reset the app ends the
 * local session, as after any reset.
 */
export function useSendSetPasswordMail() {
  return useAppMutation((email: string) => authApi.forgotPassword(email), {
    success: () => i18n.t('auth.setPasswordEmailSent'),
    // The endpoint answers alike for every address; its message adds nothing here.
    silentError: true,
    onError: () => toast.error(i18n.t('auth.couldNotSendEmail')),
  });
}
