import { useTranslation } from 'react-i18next';
import { Button } from '@/ui';
import { PageShell } from '@/components/common/PageShell';
import { ReauthModal } from '@/components/auth/ReauthModal';
import { goBackOrHome } from '@/components/common/goBackOrHome';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { useEmailChangeFlow } from './_hooks/useEmailChangeFlow';
import { EmailChangeForm } from './_sections/EmailChangeForm';

/**
 * E-posta değiştir — Profili düzenle'deki "E-posta" satırından açılan yığın ekranı (web
 * `EmailChangeModal`'ın native karşılığı). Yeni adrese kod gönder → kodu doğrula → geri dön.
 * Birincil eylem alt çubukta; vazgeçmek = geri oku.
 */
export default function EmailChangeScreen() {
  const { t } = useTranslation();
  // Doğrulanınca koruma kaldırılıp geri dönülür (`guard` çağrı anında tanımlı).
  const f = useEmailChangeFlow({ onVerified: () => guard.leave(goBackOrHome) });
  const isCodeStep = f.phase === 'codeSent';
  // Kod yalnız bu ekranın belleğinde; kod adımından çıkış onaya bağlı (yeniden istemek 60 sn bekletir).
  const guard = useUnsavedChangesGuard(isCodeStep, {
    title: t('profile.emailChangeLeaveTitle'),
    message: t('profile.emailChangeLeaveBody'),
    confirmLabel: t('profile.emailChangeLeaveConfirm'),
    cancelLabel: t('common.continueEditing'),
    destructive: true,
  });

  return (
    <PageShell
      title={t('profile.changeEmail')}
      overlay={<ReauthModal {...f.reauthModal} />}
      footer={
        isCodeStep ? (
          <Button
            variant="primary"
            size="lg"
            fullWidth
            title={t('profile.verify')}
            onPress={f.submitCode}
            isLoading={f.isVerifying}
            testID="email-change-verify"
          />
        ) : (
          <Button
            variant="primary"
            size="lg"
            fullWidth
            title={t('profile.sendCode')}
            onPress={f.submitEmail}
            isLoading={f.isRequesting}
            testID="email-change-request"
          />
        )
      }
    >
      <EmailChangeForm f={f} />
    </PageShell>
  );
}
