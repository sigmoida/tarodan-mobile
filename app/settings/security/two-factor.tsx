import { useTranslation } from 'react-i18next';
import { PageShell } from '@/components/common/PageShell';
import { useScreenCaptureProtection } from '@/lib/security/screenCapture';

import { useSecurityAuthGate } from './_hooks/useSecurityAuthGate';
import { useTwoFactorFlow } from './_hooks/useTwoFactorFlow';
import {
  BackupCodesCard,
  EnabledOptions,
  SetupFlow,
  TwoFactorFooter,
} from './_components/TwoFactorSections';
import { TwoFactorSkeleton } from './_components/TwoFactorSkeleton';
import { DisableTwoFactorModal } from './_modals/DisableTwoFactorModal';
import { RegenerateBackupCodesModal } from './_modals/RegenerateBackupCodesModal';

/**
 * İki adımlı doğrulama — sade tek ekran. 2FA kapalıyken açılışta kurulum kendiliğinden başlar:
 * QR + gizli anahtar + 6 haneli kod, "Doğrula ve Etkinleştir" alt çubukta (başlatma hatası →
 * ErrorState + tekrar dene). Başarıda yedek kodlar; 2FA açıkken yönetim (yenile / kapat
 * diyalogları). Görünüm `useTwoFactorFlow`'da; diyaloglar her zaman bağlı `overlay`'de.
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
      footer={f.view === 'enabled' ? undefined : <TwoFactorFooter f={f} />}
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
    </PageShell>
  );
}
