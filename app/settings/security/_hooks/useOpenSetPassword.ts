import { router } from 'expo-router';
import { canConfirmOnDevice, getVisibleSocialProviders } from '@/components/auth/socialProviders';
import { useAppleAvailability } from '@/hooks/useAppleAvailability';
import { useSendSetPasswordMail } from '@/hooks/useSendSetPasswordMail';
import { useSignInMethods } from '@/hooks/useSignInMethods';
import { useAuthStore } from '@/stores/authStore';

/**
 * "Set a password" from the security hub or the 2FA hint. The set-password screen needs the
 * confirm step; when this device cannot confirm (no password and no linked provider shown here:
 * an Apple-only account on Android, or Google while it is off there; ADR 0012), the
 * set-password mail is sent instead, as from the login screen.
 */
export function useOpenSetPassword() {
  const { methods } = useSignInMethods();
  const appleAvailable = useAppleAvailability();
  const email = useAuthStore((s) => s.user?.email ?? null);
  const sendMail = useSendSetPasswordMail();

  const open = () => {
    if (methods && !canConfirmOnDevice(methods, getVisibleSocialProviders({ appleAvailable }))) {
      if (email && !sendMail.isPending) sendMail.mutate(email);
      return;
    }
    router.push('/settings/security/set-password');
  };

  return { open, sending: sendMail.isPending };
}
