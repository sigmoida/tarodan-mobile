import { useEffect, useRef } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { confirm } from '@/ui';
import { useAuthStore } from '@/stores/authStore';
import { useTwoFactorStatus } from './useTwoFactorStatus';
import { useDoLogoutAll } from './useDoLogoutAll';

/**
 * Güvenlik ana ekranı: durumlar (2FA sorgusu, telefon doğrulandı mı — store'daki kullanıcıdan)
 * ve alt akışlara geçiş. Formlar artık ayrı ekranlarda (`password` / `two-factor` / `phone`).
 */
export function useSecurityHub() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const twoFactor = useTwoFactorStatus();
  const logoutAll = useDoLogoutAll();

  // B-1.7 — profil düzenleme yeni numarayı kaydedince buraya `?verifyPhone=` ile gelir: doğrulama
  // ekranına aynı parametreyle geçilir (kod orada BİR kez gider). Ref, geri dönüşte tekrar
  // yönlendirmeyi önler.
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
    openPassword: () => router.push('/settings/security/password'),
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
