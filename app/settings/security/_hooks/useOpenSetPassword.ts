import { router } from 'expo-router';
import { canConfirmOnDevice, getVisibleSocialProviders } from '@/components/auth/socialProviders';
import { useSendSetPasswordMailToSelf } from '@/hooks/useSendSetPasswordMail';
import { useSignInMethods } from '@/hooks/useSignInMethods';
import { isAppleAvailable } from '@/services/appleSignin';

/**
 * "Set a password" from the security hub or the 2FA hint. The set-password screen needs the
 * confirm step; when this device cannot confirm (no password and no linked provider shown here:
 * an Apple-only account on Android, or Google while it is off there; ADR 0012), the
 * set-password mail is sent instead, as from the login screen. Unknown methods go to the
 * screen, whose confirm step reads them again.
 */
export function useOpenSetPassword() {
  const { methods } = useSignInMethods();
  const mail = useSendSetPasswordMailToSelf();

  const open = async () => {
    if (methods) {
      // Asked at tap time: a hook's first render reports "no Apple" until the check resolves.
      const visible = getVisibleSocialProviders({ appleAvailable: await isAppleAvailable() });
      if (!canConfirmOnDevice(methods, visible)) {
        mail.send();
        return;
      }
    }
    router.push('/settings/security/set-password');
  };

  return { open: () => void open(), sending: mail.isPending };
}
