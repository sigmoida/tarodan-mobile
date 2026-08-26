import React from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Controller } from 'react-hook-form';
import { router } from 'expo-router';
import { Alert as UIAlert, Button, HStack, Input, Text, theme } from '@/ui';

import { isGoogleConfigured } from '@/services/googleSignin';
import { styles } from '../_lib/styles';
import type { LoginController } from '../_hooks/useLogin';

const { colors } = theme;

/** The login form card: unverified banner, email/password, social buttons, guest. */
export function LoginCard({ f }: { f: LoginController }) {
  const { t } = useTranslation();
  const { control, formState: { errors } } = f.form;

  return (
    <View style={styles.card}>
      <Text variant="h3" align="center">
        {t('auth.welcomeBack')}
      </Text>
      <Text variant="bodySm" tone="muted" align="center" style={{ marginBottom: theme.spacing[4] }}>
        {t('auth.loginSubtitle')}
      </Text>

      {f.unverifiedEmail ? (
        <UIAlert variant="warning" title={t('auth.unverifiedTitle')} testID="unverified-email-banner">
          {/* Adres metnin İÇİNDE geçiyor; ICU argümanı olarak veriliyor ki
              cümle yapısı dile göre değişebilsin (İngilizce'de adres başta). */}
          <Text variant="bodySm">{t('auth.unverifiedBody', { email: f.unverifiedEmail })}</Text>
          <HStack gap={2} style={{ marginTop: theme.spacing[2] }}>
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
          </HStack>
        </UIAlert>
      ) : null}

      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, value } }) => (
          <Input
            testID="login-email-input"
            label={t('auth.email')}
            leftIconName="mail-outline"
            placeholder={t('auth.emailPlaceholder')}
            value={value}
            onChangeText={onChange}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            error={errors.email?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, value } }) => (
          <Input
            testID="login-password-input"
            label={t('auth.password')}
            leftIconName="lock-closed-outline"
            placeholder="••••••••"
            value={value}
            onChangeText={onChange}
            // Maestro iOS secureTextEntry'ye inputText gönderemiyor;
            // EXPO_PUBLIC_MAESTRO=1 ile maskeyi kapat. Production: daima maskeli.
            secureTextEntry={process.env.EXPO_PUBLIC_MAESTRO !== '1'}
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
              leftIconName="shield-checkmark-outline"
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
        onPress={() => router.push('/(auth)/forgot-password' as never)}
        hitSlop={8}
        style={styles.forgotLink}
      >
        <Text variant="bodySm" tone="primary" weight="semibold">
          {t('auth.forgotPassword')}
        </Text>
      </Pressable>

      {f.errorBannerVisible ? (
        <Text
          testID="login-error-banner"
          variant="bodySm"
          tone="danger"
          align="center"
          style={{ marginBottom: theme.spacing[2] }}
        >
          {f.errorMessage || t('auth.loginFailed')}
        </Text>
      ) : null}
      {process.env.EXPO_PUBLIC_MAESTRO === '1' && f.loginMutation.isError && !f.errorMessage ? (
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

      {/* Ayraç */}
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text variant="caption" tone="muted">{t('common.or')}</Text>
        <View style={styles.dividerLine} />
      </View>

      {isGoogleConfigured() && (
        <Pressable
          testID="login-google-button"
          onPress={f.handleGoogle}
          accessibilityRole="button"
          accessibilityLabel={t('auth.continueWithGoogle')}
          disabled={f.loginMutation.isPending || f.googleLoading}
          style={[styles.googleButton, (f.loginMutation.isPending || f.googleLoading) && { opacity: 0.6 }]}
        >
          {f.googleLoading ? (
            <ActivityIndicator size="small" color={colors.text.heading} />
          ) : (
            <Ionicons name="logo-google" size={18} color={colors.text.heading} />
          )}
          <Text variant="body" weight="semibold">
            {f.googleLoading ? t('auth.signingIn') : t('auth.continueWithGoogle')}
          </Text>
        </Pressable>
      )}

      {f.appleAvailable && (
        <Pressable
          testID="login-apple-button"
          onPress={f.handleApple}
          accessibilityRole="button"
          accessibilityLabel={t('auth.continueWithApple')}
          disabled={f.loginMutation.isPending || f.appleLoading}
          style={[styles.appleButton, (f.loginMutation.isPending || f.appleLoading) && { opacity: 0.6 }]}
        >
          {f.appleLoading ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Ionicons name="logo-apple" size={18} color={colors.white} />
          )}
          <Text variant="body" weight="semibold" style={styles.appleButtonText}>
            {f.appleLoading ? t('auth.signingIn') : t('auth.continueWithApple')}
          </Text>
        </Pressable>
      )}

      <Button
        testID="continue-as-guest-button"
        variant="outline"
        size="lg"
        fullWidth
        title={t('auth.continueAsGuest')}
        onPress={f.continueAsGuest}
        disabled={f.loginMutation.isPending}
        style={{ marginTop: theme.spacing[3] }}
      />
    </View>
  );
}
