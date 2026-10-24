import { useTranslation } from 'react-i18next';
import { PageShell } from '@/components/common/PageShell';
import { useScreenCaptureProtection } from '@/lib/security/screenCapture';

import { useSecurityAuthGate } from './_hooks/useSecurityAuthGate';
import { useTwoFactorFlow } from './_hooks/useTwoFactorFlow';
import {
  BackupCodesCard,
  EnabledOptions,
  NeedsPasswordCard,
  SetupFlow,
  TwoFactorFooter,
} from './_components/TwoFactorSections';
import { TwoFactorSkeleton } from './_components/TwoFactorSkeleton';
import { DisableTwoFactorModal } from './_modals/DisableTwoFactorModal';
import { RegenerateBackupCodesModal } from './_modals/RegenerateBackupCodesModal';

/**
 * Two-factor authentication, one plain screen. While 2FA is off the setup starts by itself:
 * QR + secret + 6-digit code, "Verify and enable" in the bottom bar (a start failure shows
 * ErrorState + retry). An account without a password sees the "set a password first" hint
 * instead. After success the backup codes; while 2FA is on, management (regenerate / disable
 * dialogs). The view lives in `useTwoFactorFlow`; the dialogs sit in the always-mounted `overlay`.
 */
export default function TwoFactorScreen() {
  const { t } = useTranslation();
  const isAuthenticated = useSecurityAuthGate();
  const f = useTwoFactorFlow();
  // Gizli anahtar, QR ve yedek kodlar ekran görüntüsüne / uygulama değiştiriciye düşmez.
  useScreenCaptureProtection();
  if (!isAuthenticated) return null;

  return (
    <PageShell
      title={t('profile.security.twoFactor')}
      loading={f.isLoading}
      loadingFallback={<TwoFactorSkeleton />}
      error={f.startError}
      errorMessage={f.startError ?? undefined}
      onRetry={f.retrySetup}
      footer={f.view === 'enabled' || f.view === 'needsPassword' ? undefined : <TwoFactorFooter f={f} />}
      overlay={
        <>
          <DisableTwoFactorModal
            isOpen={f.dialog === 'disable'}
            onClose={f.closeDialog}
            onDisabled={f.onDisabled}
          />
          <RegenerateBackupCodesModal
            isOpen={f.dialog === 'regenerate'}
            onClose={f.closeDialog}
            onCodes={f.showRegeneratedCodes}
          />
        </>
      }
    >
      {f.view === 'setup' ? <SetupFlow f={f} /> : null}
      {f.view === 'codes' ? <BackupCodesCard f={f} /> : null}
      {f.view === 'enabled' ? <EnabledOptions f={f} /> : null}
      <NeedsPasswordCard f={f} />
    </PageShell>
  );
}
