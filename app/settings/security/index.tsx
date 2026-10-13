import { useEffect } from 'react';
import { router } from 'expo-router';
import { PageShell } from '@/components/common/PageShell';

import { useSecurity } from './_hooks/useSecurity';
import { SecuritySections } from './_components/SecuritySections';
import { SecurityDialogs } from './_components/SecurityDialogs';

/**
 * Security settings — THIN screen. The `useSecurity` controller owns all state,
 * the 2FA/password/phone flows, and the 4 modal-message instances; this file
 * composes the PageShell, the setting sections, and the dialogs (overlay slot).
 */
export default function SecuritySettingsScreen() {
  const f = useSecurity();

  // Yönlendirmeyi render sırasında değil effect'te yap; render içinde router.replace
  // "Cannot update a component while rendering another" uyarısına yol açıyordu.
  useEffect(() => {
    if (!f.isAuthenticated) router.replace('/(auth)/login');
  }, [f.isAuthenticated]);
  if (!f.isAuthenticated) return null;

  return (
    <PageShell
      title={f.t('mobile.settingsSecurity')}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
      overlay={<SecurityDialogs f={f} />}
    >
      <SecuritySections f={f} />
    </PageShell>
  );
}
