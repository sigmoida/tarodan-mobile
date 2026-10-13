import { useTranslation } from 'react-i18next';
import { PageShell } from '@/components/common/PageShell';

import { useSecurityAuthGate } from './_hooks/useSecurityAuthGate';
import { useTwoFactorFlow } from './_hooks/useTwoFactorFlow';
import {
  BackupCodesCard,
  EnabledOptions,
  SetupFlow,
  SetupIntro,
  TwoFactorFooter,
  TwoFactorStatusCard,
  WhyItMatters,
} from './_components/TwoFactorSections';
import { DisableTwoFactorModal } from './_modals/DisableTwoFactorModal';
import { RegenerateBackupCodesModal } from './_modals/RegenerateBackupCodesModal';

/**
 * İki adımlı doğrulama (web `/profile/security` sayfası): durum → tanıtım | kurulum (QR + anahtar
 * + kod) | yedek kodlar | yönetim (yenile / kapat diyalogları). Görünüm `useTwoFactorFlow`'da;
 * ana aksiyon PageShell alt çubuğunda, diyaloglar her zaman bağlı `overlay`'de.
 */
export default function TwoFactorScreen() {
  const { t } = useTranslation();
  const isAuthenticated = useSecurityAuthGate();
  const f = useTwoFactorFlow();
  if (!isAuthenticated) return null;

  return (
    <PageShell
      title={t('profile.security.twoFactor')}
      loading={f.isLoading}
      footer={f.view === 'enabled' ? undefined : <TwoFactorFooter f={f} />}
      overlay={
        <>
          <DisableTwoFactorModal isOpen={f.dialog === 'disable'} onClose={f.closeDialog} />
          <RegenerateBackupCodesModal
            isOpen={f.dialog === 'regenerate'}
            onClose={f.closeDialog}
            onCodes={f.showRegeneratedCodes}
          />
        </>
      }
    >
      <TwoFactorStatusCard isEnabled={f.isEnabled} />
      {f.view === 'intro' ? <SetupIntro /> : null}
      {f.view === 'setup' ? <SetupFlow f={f} /> : null}
      {f.view === 'codes' ? <BackupCodesCard f={f} /> : null}
      {f.view === 'enabled' ? <EnabledOptions f={f} /> : null}
      <WhyItMatters />
    </PageShell>
  );
}
