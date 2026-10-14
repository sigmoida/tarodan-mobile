import { useTranslation } from 'react-i18next';
import { AuthShell } from '@/components/auth/AuthShell';
import { AuthFooterLink } from '@/components/auth/AuthFooterLink';
import { Button, Text } from '@/ui';
import type { RegisterController } from '../_hooks/useRegister';

/**
 * Kayıt sonrası "Neredeyse Tamam!" durumu — web `RegisterForm` `registrationSuccess` dalı:
 * e-postaya gönderildi açıklaması, spam ipucu, "Giriş Sayfasına Git" (birincil), "Doğrulama
 * E-postasını Tekrar Gönder" (geri sayımlı) ve altta doğrulama sayfası bağlantısı.
 */
export function RegisterVerifySent({ f }: { f: RegisterController }) {
  const { t } = useTranslation();
  const { resend } = f;
  const waiting = resend.cooldown > 0;

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
      <Button
        testID="register-resend-button"
        variant="outline"
        size="lg"
        fullWidth
        title={
          waiting
            ? t('checkout.resendCodeWithTimer', { seconds: resend.cooldown })
            : t('auth.resendVerificationEmail')
        }
        onPress={resend.resend}
        isLoading={resend.isPending}
        disabled={waiting || resend.isPending}
      />
    </AuthShell>
  );
}
