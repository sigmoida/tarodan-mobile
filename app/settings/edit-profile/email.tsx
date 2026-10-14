import { useTranslation } from 'react-i18next';
import { Button } from '@/ui';
import { PageShell } from '@/components/common/PageShell';
import { goBackOrHome } from '@/components/common/goBackOrHome';
import { useEmailChangeFlow } from './_hooks/useEmailChangeFlow';
import { EmailChangeForm } from './_sections/EmailChangeForm';

/**
 * E-posta değiştir — Profili düzenle'deki "E-posta" satırından açılan yığın ekranı (web
 * `EmailChangeModal`'ın native karşılığı). Yeni adrese kod gönder → kodu doğrula → geri dön.
 * Birincil eylem alt çubukta; vazgeçmek = geri oku.
 */
export default function EmailChangeScreen() {
  const { t } = useTranslation();
  const f = useEmailChangeFlow({ onVerified: goBackOrHome });
  const isCodeStep = f.phase === 'codeSent';

  return (
    <PageShell
      title={t('profile.changeEmail')}
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
