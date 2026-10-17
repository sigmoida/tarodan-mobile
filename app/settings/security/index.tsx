import { useTranslation } from 'react-i18next';
import { PageShell } from '@/components/common/PageShell';

import { useSecurityAuthGate } from './_hooks/useSecurityAuthGate';
import { useSecurityHub } from './_hooks/useSecurityHub';
import { SecuritySections } from './_components/SecuritySections';

/**
 * Güvenlik ayarları — THIN hub. Şifre değiştirme, 2FA ve telefon doğrulama web'deki gibi ayrı
 * akışlar (`password` / `two-factor` / `phone` ekranları); burada yalnız durumlar ve girişler.
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
