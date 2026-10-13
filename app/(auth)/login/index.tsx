import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';

import { AuthShell } from '@/components/auth/AuthShell';
import { AuthFooterLink } from '@/components/auth/AuthFooterLink';
import { useLogin } from './_hooks/useLogin';
import { LoginForm } from './_components/LoginForm';

/**
 * Giriş — İNCE ekran. `useLogin` kontrolcüsü RHF formunu, giriş/yeniden-gönder mutasyonlarını
 * ve sosyal girişi yönetir; bu dosya yalnız ortak auth kabuğunu (web `(centered)` düzeni:
 * logo, başlık, form, alt bağlantılar) kurar.
 */
export default function LoginScreen() {
  const { t } = useTranslation();
  const f = useLogin();

  return (
    <AuthShell
      title={t('auth.welcomeBack')}
      description={t('auth.loginSubtitle')}
      hero="auth_default"
      back={{
        label: t('auth.backToHome'),
        onPress: f.continueAsGuest,
        testID: 'login-back-button',
      }}
      footer={
        <>
          <AuthFooterLink
            prompt={t('auth.noAccount')}
            linkLabel={t('auth.signUp')}
            onPress={() => router.push('/(auth)/register' as never)}
          />
          <AuthFooterLink
            prompt={t('auth.isBusinessOwnerPrompt')}
            linkLabel={t('auth.openBusinessAccountCta')}
            onPress={() => router.push('/(auth)/register-business' as never)}
          />
        </>
      }
    >
      <LoginForm f={f} />
    </AuthShell>
  );
}
