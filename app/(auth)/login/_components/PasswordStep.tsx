import React from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { Controller } from 'react-hook-form';
import { Alert as UIAlert, Button, ButtonRow, Input, Text, theme } from '@/ui';
import { IS_MAESTRO } from '@/config/maestro';
import { styles } from '../_lib/styles';
import type { LoginController } from '../_hooks/useLogin';
import { ResolvedEmail } from './ResolvedEmail';

/**
 * Adım 2 (web "password"): çözülmüş e-posta kutusu, şifre (göz ikonlu), gerekirse 2FA kodu,
 * sağa hizalı "Şifremi Unuttum", hata / doğrulanmamış e-posta bantları ve "Giriş Yap".
 */
export function PasswordStep({ f }: { f: LoginController }) {
  const { t } = useTranslation();
  const { control, formState: { errors } } = f.form;

  return (
    <View style={styles.form}>
      <ResolvedEmail email={f.email} onChange={f.back} />

      {f.unverifiedEmail ? (
        <UIAlert variant="warning" title={t('auth.unverifiedTitle')} testID="unverified-email-banner">
          {/* Adres metnin İÇİNDE geçiyor; ICU argümanı olarak veriliyor ki
              cümle yapısı dile göre değişebilsin (İngilizce'de adres başta). */}
          <Text variant="bodySm">{t('auth.unverifiedBody', { email: f.unverifiedEmail })}</Text>
          <ButtonRow style={{ marginTop: theme.spacing[2] }}>
            <Button
              variant="outline"
              size="sm"
              title={
                f.resendVerificationMutation.isPending
                  ? t('common.sending')
                  : t('auth.resendVerification')
              }
              onPress={() => f.resendVerificationMutation.mutate()}
              disabled={f.resendVerificationMutation.isPending}
            />
            <Button variant="ghost" size="sm" title={t('common.close')} onPress={() => f.setUnverifiedEmail(null)} />
          </ButtonRow>
        </UIAlert>
      ) : null}

      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, value } }) => (
          <Input
            testID="login-password-input"
            label={t('auth.password')}
            placeholder="••••••••"
            value={value}
            onChangeText={onChange}
            // Maestro iOS secureTextEntry'ye inputText gönderemiyor;
            // Maestro build'inde (IS_MAESTRO) maskeyi kapat. Production: daima maskeli.
            secureTextEntry={!IS_MAESTRO}
            togglePasswordVisibility
            autoComplete="password"
            error={errors.password?.message}
          />
        )}
      />

      {f.requires2FA ? (
        <Controller
          control={control}
          name="twoFactorCode"
          render={({ field: { onChange, value } }) => (
            <Input
              testID="login-2fa-code-input"
              label={t('auth.twoFactorCodeLabel')}
              placeholder={t('auth.twoFactorCodePlaceholder')}
              value={value}
              onChangeText={onChange}
              autoCapitalize="characters"
              autoCorrect={false}
              helperText={t('auth.twoFactorCodeHelp')}
              error={errors.twoFactorCode?.message}
            />
          )}
        />
      ) : null}

      <Pressable
        testID="login-forgot-password-link"
        onPress={() => router.push('/(auth)/forgot-password' as never)}
        accessibilityRole="link"
        hitSlop={theme.spacing[3]}
        style={styles.forgotLink}
      >
        <Text variant="bodySm" tone="primary" weight="medium">
          {t('auth.forgotPassword')}
        </Text>
      </Pressable>

      {f.errorBannerVisible ? (
        <Text testID="login-error-banner" variant="bodySm" tone="danger">
          {f.errorMessage || t('auth.loginFailed')}
        </Text>
      ) : null}
      {IS_MAESTRO && f.loginMutation.isError && !f.errorMessage ? (
        <Text testID="login-error-banner-fallback" style={{ height: 0, opacity: 0 }}>
          login-error
        </Text>
      ) : null}

      <Button
        testID="login-submit-button"
        variant="primary"
        size="lg"
        fullWidth
        title={t('auth.loginTitle')}
        onPress={f.handleLoginPress}
        isLoading={f.loginMutation.isPending}
        disabled={f.loginMutation.isPending}
      />
    </View>
  );
}
