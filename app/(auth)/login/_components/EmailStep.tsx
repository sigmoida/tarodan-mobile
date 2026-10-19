import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { Controller } from 'react-hook-form';
import { Button, Input, Text } from '@/ui';
import { styles } from '../_lib/styles';
import type { LoginController } from '../_hooks/useLogin';
import { SocialButtons } from '@/components/auth/SocialButtons';
import { getVisibleSocialProviders } from '@/components/auth/socialProviders';

/**
 * Step 1 (web "identify"): Google / Apple, the "or" divider, e-mail, "Continue". The divider
 * shows only when at least one provider button is rendered (none on Android while Google
 * is off). When the e-mail is not registered, a warning with a
 * "Sign up" link appears under the field (web `notRegistered`).
 */
export function EmailStep({ f }: { f: LoginController }) {
  const { t } = useTranslation();
  const { control, formState: { errors } } = f.form;
  const hasSocial = getVisibleSocialProviders(f.social).any;

  return (
    <View style={styles.form}>
      <SocialButtons social={f.social} busy={f.loginMutation.isPending} testIDPrefix="login" />

      {hasSocial ? (
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text variant="caption" tone="muted" style={styles.upper}>{t('common.or')}</Text>
          <View style={styles.dividerLine} />
        </View>
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

      {/* Apple 1.2: the terms must show before registering OR signing in. "Continue with
          Apple/Google" creates an account on first use and skips the register screen's
          consent checkbox, so the notice sits on the first step of the login flow (step 2
          is reached only through it). The copy is provider-neutral, so it stays true on
          every platform whichever provider buttons show. */}
      <View style={styles.terms}>
        <Text variant="caption" tone="muted">
          {t('auth.loginTermsNotice')}
        </Text>
        {/* One line of text: the links are nested Text and the space between them is a real
            space character (HStack `gap` takes raw pt; `gap={1}` was 1pt and "and" touched). */}
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
