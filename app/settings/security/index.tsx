import { useTranslation } from 'react-i18next';
import { PageShell } from '@/components/common/PageShell';

import { useSecurityAuthGate } from './_hooks/useSecurityAuthGate';
import { useSecurityHub } from './_hooks/useSecurityHub';
import { SecuritySections } from './_components/SecuritySections';

/**
 * Security settings, a THIN hub. Changing or setting a password, connected accounts, 2FA and phone
 * verification are separate flows as on web (the `password`, `set-password`, `connected-accounts`,
 * `two-factor` and `phone` screens);
 * the hub shows only their states and entries.
 */
export default function SecuritySettingsScreen() {
  const { t } = useTranslation();
  const isAuthenticated = useSecurityAuthGate();
  const hub = useSecurityHub();
  if (!isAuthenticated) return null;

  return (
    <PageShell title={t('mobile.settingsSecurity')}>
      <SecuritySections f={hub} />
    </PageShell>
  );
}
