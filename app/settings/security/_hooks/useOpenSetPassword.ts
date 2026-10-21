import { useRef } from 'react';
import { router } from 'expo-router';
import { canConfirmOnDevice, visibleSocialProvidersNow } from '@/components/auth/socialProviders';
import { useSendSetPasswordMailToSelf } from '@/hooks/useSendSetPasswordMail';
import { useSignInMethods } from '@/hooks/useSignInMethods';

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

  // The availability check is async: a second tap meanwhile must not push or mail twice.
  const busy = useRef(false);
  const open = async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      if (methods && !canConfirmOnDevice(methods, await visibleSocialProvidersNow())) {
        mail.send();
        return;
      }
      router.push('/settings/security/set-password');
    } finally {
      busy.current = false;
    }
  };

  return { open: () => void open(), sending: mail.isPending };
}
