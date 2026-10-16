import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { Button, Input, Spinner, appAlert, theme } from '@/ui';
import { AuthShell } from '@/components/auth/AuthShell';
import { authApi } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api/errorText';
import { ResendVerification } from '@/components/auth/ResendVerification';
import { useAuthStore } from '@/stores/authStore';
import { usePendingAuthEmailStore } from '@/stores/pendingAuthEmailStore';

const { colors } = theme;

type Status = 'idle' | 'verifying' | 'success' | 'error';

export default function VerifyEmailScreen() {
  const { t } = useTranslation();
  const { token: tokenParam, email: emailParam } = useLocalSearchParams<{
    token?: string;
    email?: string;
  }>();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const pendingEmail = usePendingAuthEmailStore((st) => st.email);
  // API doğrulama yanıtında e-posta dönmez: güvenilir kaynaklar oturum ve kayıt anında saklanan adres.
  // `?email=` bağlantı paramı DOĞRULANMAMIŞ girdidir: metinde gösterilmez, store'un önüne geçmez,
  // yalnız misafir e-posta alanını ön doldurur.
  const knownEmail = user?.email || pendingEmail || null;
  const prefillEmail = typeof emailParam === 'string' ? emailParam.trim() || null : null;
  const [manualToken, setManualToken] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const verifyMutation = useMutation({
    mutationFn: (token: string) => authApi.verifyEmail(token),
    onSuccess: () => {
      // Oturumlu kullanıcı girişe gitmeyecek: bellek içi e-posta işini bitirdi. Misafirde giriş
      // ekranı ön dolduruyor; orada giriş başarısında / çıkışta temizlenir (authStore).
      if (isAuthenticated) usePendingAuthEmailStore.getState().setEmail(null);
      setStatus('success');
      setErrorMsg(null);
    },
    onError: (e: unknown) => {
      setStatus('error');
      setErrorMsg(apiErrorMessage(e, t('auth.verifyLinkInvalid')));
    },
  });

  useEffect(() => {
    if (tokenParam && status === 'idle') {
      setStatus('verifying');
      verifyMutation.mutate(tokenParam);
    }
  }, [tokenParam, status, verifyMutation]);

  const handleManual = () => {
    if (!manualToken.trim()) return appAlert(t('auth.verifyCodeMissingTitle'), t('auth.verifyCodeMissingBody'));
    setStatus('verifying');
    verifyMutation.mutate(manualToken.trim());
  };

  const goHome = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'));
  // Oturumlu: e-posta sabit, yalnız düğme. Misafir: e-posta alanı + düğme.
  const resendBlock = (variant: 'primary' | 'outline') => (
    <ResendVerification
      email={knownEmail}
      prefill={prefillEmail}
      askEmail={!isAuthenticated}
      variant={variant}
    />
  );

  // E-posta girişe URL'siz taşınır: login `pendingAuthEmailStore`'dan önceden doldurur.
  const goToLogin = () => router.replace('/(auth)/login');

  if (status === 'verifying') {
    return (
      <AuthShell title={t('auth.verifyingEmail')} description={t('auth.pleaseWait')}>
        <Spinner color={colors.primary[600]} />
      </AuthShell>
    );
  }

  if (status === 'success') {
    return (
      <AuthShell title={t('auth.emailVerified')} description={t('auth.emailVerifiedDesc')}>
        <Button
          variant="primary"
          size="lg"
          fullWidth
          title={isAuthenticated ? t('common.continueAction') : t('common.login')}
          onPress={() => (isAuthenticated ? router.replace('/(tabs)') : goToLogin())}
        />
      </AuthShell>
    );
  }

  if (status === 'error') {
    return (
      <AuthShell
        title={t('auth.verificationFailed')}
        description={errorMsg || t('auth.verifyLinkInvalidLong')}
      >
        {resendBlock('primary')}
        <Button
          variant="ghost"
          fullWidth
          title={t('auth.verifyBackToLogin')}
          onPress={() => goToLogin()}
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={t('auth.emailVerification')}
      description={
        knownEmail
          ? t('auth.verifyInstructionsWithEmail', { email: knownEmail })
          : t('auth.verifyInstructions')
      }
      onBack={goHome}
    >
      <Input
        label={t('auth.verifyCodeLabel')}
        value={manualToken}
        onChangeText={setManualToken}
        autoCapitalize="none"
      />

      <Button
        variant="primary"
        size="lg"
        fullWidth
        title={t('auth.verifyCodeSubmit')}
        onPress={handleManual}
        disabled={!manualToken.trim()}
      />

      {resendBlock('outline')}
    </AuthShell>
  );
}
