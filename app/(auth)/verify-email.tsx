import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import {
  Button,
  Input,
  ScreenHeader,
  Spinner,
  Text,
  VStack,
  theme,
  appAlert,
} from '@/ui';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

const { colors, spacing } = theme;

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
      appAlert(
        t('auth.verificationResentTitle'),
        t('auth.verifyResentBody'),
      );
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

  const iconName =
    status === 'success' ? 'mail-open' : status === 'error' ? 'alert-circle' : 'mail';
  const iconColor =
    status === 'success'
      ? colors.success[600]!
      : status === 'error'
        ? colors.danger[600]!
        : colors.primary[600]!;

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.DEFAULT }}>
      <ScreenHeader title={t('auth.emailVerification')} onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} />

      <VStack gap={2} align="center" padding={6} flex={1}>
        <View style={{ marginTop: spacing[4], marginBottom: spacing[2] }}>
          <Ionicons name={iconName} size={72} color={iconColor} />
        </View>

        {status === 'verifying' ? (
          <>
            <Text variant="h2" align="center">
              {t('auth.verifyingEmail')}
            </Text>
            <Spinner color={colors.primary[600]!} />
          </>
        ) : status === 'success' ? (
          <>
            <Text variant="h2" align="center">
              {t('auth.emailVerified')}
            </Text>
            <Text variant="bodySm" tone="muted" align="center">
              {t('auth.emailVerifiedDesc')}
            </Text>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              title={t('common.continueAction')}
              onPress={() =>
                router.replace(isAuthenticated ? '/(tabs)' : '/(auth)/login')
              }
              style={{ marginTop: spacing[3] }}
            />
          </>
        ) : status === 'error' ? (
          <>
            <Text variant="h2" align="center">
              {t('auth.verificationFailed')}
            </Text>
            <Text variant="bodySm" tone="muted" align="center">
              {errorMsg || t('auth.verifyLinkInvalidLong')}
            </Text>
            {isAuthenticated ? (
              <Button
                variant="primary"
                size="lg"
                fullWidth
                title={t('auth.verifyRequestNewLink')}
                icon="mail-outline"
                onPress={() => resendMutation.mutate()}
                isLoading={resendMutation.isPending}
                disabled={resendMutation.isPending || !user?.email}
                style={{ marginTop: spacing[3] }}
              />
            ) : null}
            <Button
              variant="ghost"
              fullWidth
              title={t('auth.verifyBackToLogin')}
              onPress={() => router.replace('/(auth)/login')}
            />
          </>
        ) : (
          <>
            <Text variant="h2" align="center">
              {t('auth.emailVerification')}
            </Text>
            <Text variant="bodySm" tone="muted" align="center">
              {user?.email
                ? t('auth.verifyInstructionsWithEmail', { email: user.email })
                : t('auth.verifyInstructions')}
            </Text>

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

            {isAuthenticated ? (
              <Button
                variant="ghost"
                fullWidth
                title={t('auth.verifyResend')}
                icon="mail-outline"
                onPress={() => resendMutation.mutate()}
                isLoading={resendMutation.isPending}
                disabled={resendMutation.isPending || !user?.email}
              />
            ) : null}
          </>
        )}
      </VStack>
    </View>
  );
}
