import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';

import { AuthShell } from '@/components/auth/AuthShell';
import { AuthFooterLink } from '@/components/auth/AuthFooterLink';
import { useLogin } from './_hooks/useLogin';
import { LoginForm } from './_components/LoginForm';

/**
 * Giriş — İNCE ekran. `useLogin` kontrolcüsü RHF formunu, iki aşamalı akışı (e-posta → şifre),
 * giriş/yeniden-gönder mutasyonlarını ve sosyal girişi yönetir; bu dosya yalnız ortak auth
 * kabuğunu (başlık üst barda, logo yok) kurar. Geri oku yalnız yığında geri gidilecek bir ekran
 * varsa çizilir; giriş ana girişse (derin bağlantı / oturum sonu) yoktur — "Misafir olarak
 * devam et" çıkış yolu olarak kalır.
 */
export default function LoginScreen() {
  const { t } = useTranslation();
  const f = useLogin();

  return (
    <AuthShell
      title={t('auth.loginTitle')}
      hero="auth_default"
      showBack={router.canGoBack()}
      onBack={f.continueAsGuest}
      footer={
        <AuthFooterLink
          prompt={t('auth.noAccount')}
          linkLabel={t('common.register')}
          testID="login-register-link"
          onPress={() => router.push('/(auth)/register' as never)}
        />
      }
    >
      <LoginForm f={f} />
    </AuthShell>
  );
}
