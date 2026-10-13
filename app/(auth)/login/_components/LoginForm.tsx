import React from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Controller } from 'react-hook-form';
import { router } from 'expo-router';
import { Alert as UIAlert, Button, HStack, Input, Text, theme, ButtonRow } from '@/ui';

import { isGoogleConfigured } from '@/services/googleSignin';
import { styles } from '../_lib/styles';
import type { LoginController } from '../_hooks/useLogin';
import { IS_MAESTRO } from '@/config/maestro';

const { colors } = theme;

/**
 * Giriş formu (web `LoginForm`): uyarı bandı, e-posta/parola, sosyal girişler, misafir.
 * Çerçeve/kart yok — başlık ve kabuk `AuthShell`'de.
 */
export function LoginForm({ f }: { f: LoginController }) {
  const { t } = useTranslation();
  const { control, formState: { errors } } = f.form;
  const socialBusy = f.loginMutation.isPending;

  return (
    <View style={styles.form}>
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
        name="email"
        render={({ field: { onChange, value } }) => (
          <Input
            testID="login-email-input"
            label={t('auth.email')}
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
        onPress={() => router.push('/(auth)/forgot-password' as never)}
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

      {/* Ayraç */}
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text variant="caption" tone="muted">{t('common.or')}</Text>
        <View style={styles.dividerLine} />
      </View>

      {isGoogleConfigured() && (
        <Button
          testID="login-google-button"
          variant="outline"
          size="lg"
          fullWidth
          // Marka logosu (web aynı yerde Google logosu gösterir) — dekoratif ikon kuralının istisnası.
          // eslint-disable-next-line tarodan/restrict-button-icon
          leftIcon={<Ionicons name="logo-google" size={theme.iconSize.md} color={colors.text.body} />}
          title={f.googleLoading ? t('auth.signingIn') : t('auth.continueWithGoogle')}
          accessibilityLabel={t('auth.continueWithGoogle')}
          onPress={f.handleGoogle}
          isLoading={f.googleLoading}
          disabled={socialBusy || f.googleLoading}
        />
      )}

      {f.appleAvailable && (
        // Apple HIG: siyah "Apple ile devam et" düğmesi (web'de outline; mağaza yönergesi için
        // yerel görünüm korunur). Ölçü ve köşe diğer düğmelerle aynı rol token'ları.
        <Pressable
          testID="login-apple-button"
          onPress={f.handleApple}
          accessibilityRole="button"
          accessibilityLabel={t('auth.continueWithApple')}
          disabled={socialBusy || f.appleLoading}
          style={[styles.appleButton, (socialBusy || f.appleLoading) && styles.disabled]}
        >
          {f.appleLoading ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Ionicons name="logo-apple" size={theme.iconSize.md} color={colors.white} />
          )}
          <Text variant="body" weight="medium" style={styles.appleButtonText}>
            {f.appleLoading ? t('auth.signingIn') : t('auth.continueWithApple')}
          </Text>
        </Pressable>
      )}

      {/* Apple 1.2: koşullar kayıttan VEYA girişten önce gösterilmeli. Apple/Google
          ile devam et ilk kullanımda hesap açar ve kayıt ekranındaki onay
          kutusundan geçmez — bildirim bu yüzden giriş formunda da duruyor. */}
      <View style={styles.terms}>
        <Text variant="caption" tone="muted">
          {t('auth.loginTermsNotice')}
        </Text>
        <HStack wrap gap={1}>
          <Text testID="login-terms-link" variant="caption" tone="primary" weight="semibold" onPress={() => router.push('/terms')}>
            {t('footer.terms')}
          </Text>
          <Text variant="caption" tone="muted">{t('common.and')}</Text>
          <Text testID="login-privacy-link" variant="caption" tone="primary" weight="semibold" onPress={() => router.push('/privacy')}>
            {t('footer.privacy')}
          </Text>
        </HStack>
      </View>

      <Button
        testID="continue-as-guest-button"
        variant="outline"
        size="lg"
        fullWidth
        title={t('auth.continueAsGuest')}
        onPress={f.continueAsGuest}
        disabled={f.loginMutation.isPending}
      />
    </View>
  );
}
