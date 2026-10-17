import { useTranslation } from 'react-i18next';
import { AuthShell } from '@/components/auth/AuthShell';
import { AuthFooterLink } from '@/components/auth/AuthFooterLink';
import { Button, Text } from '@/ui';
import { ResendVerification } from '@/components/auth/ResendVerification';
import type { RegisterController } from '../_hooks/useRegister';

/**
 * Kayıt sonrası "Neredeyse Tamam!" durumu — web `RegisterForm` `registrationSuccess` dalı:
 * e-postaya gönderildi açıklaması, spam ipucu, "Giriş Sayfasına Git" (birincil), "Doğrulama
 * E-postasını Tekrar Gönder" (geri sayımlı) ve altta doğrulama sayfası bağlantısı.
 */
export function RegisterVerifySent({ f }: { f: RegisterController }) {
  const { t } = useTranslation();

  return (
    <AuthShell
      title={t('auth.almostThere')}
      onBack={f.goToLogin}
      testID="register-verify-sent"
      description={
        <Text variant="bodySm" tone="muted">
          {t('auth.verificationSentTo')}
          <Text variant="bodySm" tone="body" weight="semibold" testID="register-verify-email">
            {f.registeredEmail}
          </Text>
        </Text>
      }
      footer={
        <AuthFooterLink
          linkLabel={t('auth.verifyLaterLink')}
          testID="register-verify-later-link"
          onPress={f.goToVerifyEmail}
        />
      }
    >
      <Text variant="bodySm" tone="muted">
        {t('auth.verificationSpamHint')}
      </Text>
      <Button
        testID="register-go-login-button"
        variant="primary"
        size="lg"
        fullWidth
        title={t('auth.goToLogin')}
        onPress={f.goToLogin}
      />
      <ResendVerification
        testID="register-resend"
        email={f.registeredEmail}
        askEmail={false}
        variant="outline"
        label={t('auth.resendVerificationEmail')}
      />
    </AuthShell>
  );
}
