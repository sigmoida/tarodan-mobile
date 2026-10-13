import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { TFunction } from 'i18next';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Button, Input, Text } from '@/ui';
import { authApi } from '@/lib/api';
import { AuthShell } from '@/components/auth/AuthShell';

/**
 * Şema bir FABRİKA: zod mesajları modül seviyesinde üretilseydi `t` daha
 * kurulmadan çalışır ve hata metni her zaman ilk dilde donardı. Çevirmeni
 * argüman alan bu biçim, dil değiştiğinde mesajın da değişmesini sağlıyor.
 */
const buildForgotSchema = (t: TFunction) =>
  z.object({
    email: z.string().email(t('auth.emailInvalid')),
  });

type ForgotForm = z.infer<ReturnType<typeof buildForgotSchema>>;

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const [sent, setSent] = useState(false);
  // Dil değişince şema yeniden kurulur; aksi halde eski dildeki mesaj kalırdı.
  const forgotSchema = useMemo(() => buildForgotSchema(t), [t]);

  const { control, handleSubmit, formState: { errors } } = useForm<ForgotForm>({
    resolver: zodResolver(forgotSchema),
  });

  const forgotMutation = useMutation({
    mutationFn: (data: ForgotForm) => authApi.forgotPassword(data.email),
    onSuccess: () => setSent(true),
  });

  const onSubmit = (data: ForgotForm) => forgotMutation.mutate(data);

  if (sent) {
    return (
      <AuthShell title={t('auth.forgotSentTitle')} description={t('auth.forgotSentBody')}>
        <Button
          variant="primary"
          size="lg"
          fullWidth
          title={t('auth.forgotBackToLogin')}
          onPress={() => router.push('/(auth)/login')}
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={t('auth.forgotPassword')}
      description={t('auth.forgotSubtitle')}
      back={{ label: t('common.goBack'), onPress: () => router.back() }}
    >
      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, value } }) => (
          <Input
            testID="forgot-email-input"
            label={t('auth.email')}
            placeholder={t('auth.emailPlaceholder')}
            value={value}
            onChangeText={onChange}
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email?.message}
          />
        )}
      />

      {forgotMutation.isError ? (
        <Text variant="bodySm" tone="danger">
          {t('common.genericError')}
        </Text>
      ) : null}

      <Button
        testID="forgot-submit-button"
        variant="primary"
        size="lg"
        fullWidth
        title={t('auth.forgotSubmit')}
        onPress={handleSubmit(onSubmit)}
        isLoading={forgotMutation.isPending}
        disabled={forgotMutation.isPending}
      />
    </AuthShell>
  );
}
