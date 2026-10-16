import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { Controller } from 'react-hook-form';
import { Button, Input, Text } from '@/ui';
import { styles } from '../_lib/styles';
import type { LoginController } from '../_hooks/useLogin';
import { SocialButtons } from '@/components/auth/SocialButtons';

/**
 * Adım 1 (web "identify"): Google / Apple, "VEYA" ayıracı, e-posta, "Devam Et". E-posta
 * kayıtlı değilse alanın altında "Üye Ol" bağlantılı uyarı çıkar (web `notRegistered`).
 */
export function EmailStep({ f }: { f: LoginController }) {
  const { t } = useTranslation();
  const { control, formState: { errors } } = f.form;

  return (
    <View style={styles.form}>
      <SocialButtons social={f.social} busy={f.loginMutation.isPending} testIDPrefix="login" />

      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text variant="caption" tone="muted" style={styles.upper}>{t('common.or')}</Text>
        <View style={styles.dividerLine} />
      </View>

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
            autoCorrect={false}
            returnKeyType="next"
            onSubmitEditing={f.identify}
            error={errors.email?.message}
          />
        )}
      />

      {f.notRegistered ? (
        <Text testID="login-email-not-registered" variant="bodySm" tone="danger">
          {`${t('auth.emailNotRegistered')} `}
          <Text
            variant="bodySm"
            tone="danger"
            weight="semibold"
            style={styles.underline}
            onPress={() => router.push('/(auth)/register' as never)}
            accessibilityRole="link"
          >
            {t('common.register')}
          </Text>
        </Text>
      ) : null}

      <Button
        testID="login-continue-button"
        variant="primary"
        size="lg"
        fullWidth
        title={t('common.continue')}
        onPress={f.identify}
        isLoading={f.identifying}
        disabled={f.identifying || f.googleLoading || f.appleLoading}
      />

      {/* Apple 1.2: koşullar kayıttan VEYA girişten önce gösterilmeli. Apple/Google
          ile devam et ilk kullanımda hesap açar ve kayıt ekranındaki onay
          kutusundan geçmez — bildirim bu yüzden giriş akışının ilk adımında duruyor
          (2. adıma yalnız bu adımdan geçilir). */}
      <View style={styles.terms}>
        <Text variant="caption" tone="muted">
          {t('auth.loginTermsNotice')}
        </Text>
        {/* Tek satır metin: bağlantılar iç içe Text, aralarındaki boşluk gerçek boşluk karakteri
            (HStack `gap` ham sayıyı pt alır — `gap={1}` 1pt'ydi, "ve" bitişik görünüyordu). */}
        <Text variant="caption" tone="muted">
          <Text testID="login-terms-link" variant="caption" tone="primary" weight="semibold" onPress={() => router.push('/terms')}>
            {t('footer.terms')}
          </Text>
          {` ${t('common.and')} `}
          <Text testID="login-privacy-link" variant="caption" tone="primary" weight="semibold" onPress={() => router.push('/privacy')}>
            {t('footer.privacy')}
          </Text>
        </Text>
      </View>
    </View>
  );
}
