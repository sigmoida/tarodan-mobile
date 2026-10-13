import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { Button, Input, Spinner, appAlert, theme, toast } from '@/ui';
import { AuthShell } from '@/components/auth/AuthShell';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

const { colors } = theme;

type Status = 'idle' | 'verifying' | 'success' | 'error';

export default function VerifyEmailScreen() {
  const { t } = useTranslation();
  const { token: tokenParam } = useLocalSearchParams<{ token?: string }>();
  const { isAuthenticated, user } = useAuthStore();
  const [manualToken, setManualToken] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const verifyMutation = useMutation({
    mutationFn: (token: string) => authApi.verifyEmail(token),
    onSuccess: () => {
      setStatus('success');
      setErrorMsg(null);
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { message?: string } } };
      setStatus('error');
      setErrorMsg(err?.response?.data?.message || t('auth.verifyLinkInvalid'));
    },
  });

  const resendMutation = useMutation({
    mutationFn: () => authApi.resendVerification(user?.email ?? ''),
    onSuccess: () => {
      // Bilgi mesajı → toast (web react-hot-toast); hata yolu diyalogda kalır.
      toast.success(t('auth.verifyResentBody'));
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { message?: string } } };
      appAlert(t('common.error'), err?.response?.data?.message || t('auth.verificationResendFailed'));
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
  const resendButton = (variant: 'primary' | 'outline', title: string) =>
    isAuthenticated ? (
      <Button
        variant={variant}
        size="lg"
        fullWidth
        title={title}
        onPress={() => resendMutation.mutate()}
        isLoading={resendMutation.isPending}
        disabled={resendMutation.isPending || !user?.email}
      />
    ) : null;

  if (status === 'verifying') {
    return (
      <AuthShell title={t('auth.verifyingEmail')}>
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
          title={t('common.continueAction')}
          onPress={() => router.replace(isAuthenticated ? '/(tabs)' : '/(auth)/login')}
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
        {resendButton('primary', t('auth.verifyRequestNewLink'))}
        <Button
          variant="ghost"
          fullWidth
          title={t('auth.verifyBackToLogin')}
          onPress={() => router.replace('/(auth)/login')}
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={t('auth.emailVerification')}
      description={
        user?.email
          ? t('auth.verifyInstructionsWithEmail', { email: user.email })
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

      {resendButton('outline', t('auth.verifyResend'))}
    </AuthShell>
  );
}
