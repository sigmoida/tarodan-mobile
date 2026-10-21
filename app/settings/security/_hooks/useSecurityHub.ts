import { useEffect, useRef } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { confirm } from '@/ui';
import { useAuthStore } from '@/stores/authStore';
import { useSignInMethods } from '@/hooks/useSignInMethods';
import { useTwoFactorStatus } from './useTwoFactorStatus';
import { useDoLogoutAll } from './useDoLogoutAll';
import { useOpenSetPassword } from './useOpenSetPassword';

/**
 * Password card mode (web `SecuritySection`): `change` with a password, `set` without one.
 * While the sign-in methods load the card waits (`loading`); if they cannot be read it falls
 * back to `change`, the behaviour before the sign-in methods API existed.
 */
export type PasswordCardMode = 'change' | 'set' | 'loading';

/**
 * Security hub: the states (2FA query, sign-in methods, phone verified from the stored user)
 * and the entries to the sub-flows. The forms live on their own screens
 * (`password` / `set-password` / `two-factor` / `phone`).
 */
export function useSecurityHub() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const twoFactor = useTwoFactorStatus();
  const signIn = useSignInMethods();
  const setPassword = useOpenSetPassword();
  const logoutAll = useDoLogoutAll();

  const passwordMode: PasswordCardMode = signIn.methods
    ? signIn.methods.hasPassword
      ? 'change'
      : 'set'
    : signIn.isError
      ? 'change'
      : 'loading';

  // B-1.7: after edit profile saves a new number it lands here with `?verifyPhone=`; forward to
  // the verification screen with the same parameter (the code is sent there, once). The ref
  // stops a second forward on the way back.
  const { verifyPhone } = useLocalSearchParams<{ verifyPhone?: string }>();
  const forwardedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!isAuthenticated || !verifyPhone || forwardedFor.current === verifyPhone) return;
    forwardedFor.current = verifyPhone;
    router.push({ pathname: '/settings/security/phone', params: { verifyPhone } });
  }, [isAuthenticated, verifyPhone]);

  return {
    phoneVerified: !!user?.isPhoneVerified,
    twoFactorEnabled: twoFactor.isEnabled,
    passwordMode,
    openPassword: () => router.push('/settings/security/password'),
    openSetPassword: setPassword.open,
    sendingSetPasswordMail: setPassword.sending,
    openTwoFactor: () => router.push('/settings/security/two-factor'),
    openPhone: () => router.push('/settings/security/phone'),
    openDeleteAccount: () => router.push('/settings/delete-account'),
    logoutAllPending: logoutAll.isPending,
    logoutAllDevices: async () => {
      const ok = await confirm({
        title: t('security.logoutAllTitle'),
        message: t('security.logoutAllBody'),
        confirmLabel: t('common.logout'),
        destructive: true,
      });
      if (ok) logoutAll.mutate();
    },
  };
}

export type SecurityHub = ReturnType<typeof useSecurityHub>;
