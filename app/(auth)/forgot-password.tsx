import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { TFunction } from 'i18next';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Button, Input, Screen, Text, VStack, theme } from '@/ui';
import { authApi } from '@/lib/api';
import { BrandLogo } from '@/components/BrandLogo';

const { colors } = theme;

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
      <Screen center style={styles.screen}>
        <VStack gap={5}>
          <View style={styles.brandHeader}>
            <BrandLogo />
          </View>
          <View style={styles.card}>
            <Text variant="h3" align="center">
              {t('auth.forgotSentTitle')}
            </Text>
            <Text variant="bodySm" tone="muted" align="center" style={{ marginTop: theme.spacing[2], marginBottom: theme.spacing[4] }}>
              {t('auth.forgotSentBody')}
            </Text>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              title={t('auth.forgotBackToLogin')}
              onPress={() => router.push('/(auth)/login')}
            />
          </View>
        </VStack>
      </Screen>
    );
  }

  return (
    <Screen center style={styles.screen}>
      <VStack gap={5}>
        <View style={styles.brandHeader}>
          <BrandLogo />
        </View>

        <View style={styles.card}>
          <Text variant="h3" align="center">
            {t('auth.forgotPassword')}
          </Text>
          <Text variant="bodySm" tone="muted" align="center" style={{ marginTop: theme.spacing[2], marginBottom: theme.spacing[4] }}>
            {t('auth.forgotSubtitle')}
          </Text>

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value } }) => (
              <Input
                testID="forgot-email-input"
                label={t('auth.email')}
                leftIconName="mail-outline"
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
            <Text variant="bodySm" tone="danger" align="center" style={{ marginBottom: theme.spacing[2] }}>
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

          <Button variant="ghost" fullWidth title={t('common.goBack')} onPress={() => router.back()} style={{ marginTop: theme.spacing[1] }} />
        </View>
      </VStack>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.primary[600]!,
  },
  brandHeader: {
    alignItems: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: colors.surface.elevated,
    borderRadius: 20,
    padding: theme.spacing[5],
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
});
