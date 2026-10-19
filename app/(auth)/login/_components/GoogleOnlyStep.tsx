import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, Text } from '@/ui';
import { styles } from '../_lib/styles';
import type { LoginController } from '../_hooks/useLogin';
import { ResolvedEmail } from './ResolvedEmail';
import { SocialButtons } from '@/components/auth/SocialButtons';
import { getVisibleSocialProviders } from '@/components/auth/socialProviders';

/**
 * Step 2 (alternative, web "googleOnly"): the account was created with Google and has no
 * password. Sign in with Google, or "Set a password" (the link goes to the e-mail). Apple makes
 * no sense here (same on web), so it is left out on purpose. Where no Google button renders
 * (Android while Google is off) the notice only offers the password, not a missing button.
 */
export function GoogleOnlyStep({ f }: { f: LoginController }) {
  const { t } = useTranslation();
  const hasGoogle = getVisibleSocialProviders(f.social, { apple: false }).google;

  return (
    <View style={styles.form}>
      <ResolvedEmail email={f.email} onChange={f.back} />
      <Text testID="login-google-only-notice" variant="bodySm" tone="body" style={styles.notice}>
        {t(hasGoogle ? 'auth.googleOnlyAccount' : 'mobile.googleOnlyAccountNoGoogle')}
      </Text>
      <SocialButtons social={f.social} busy={f.loginMutation.isPending} apple={false} testIDPrefix="login" />
      <Button
        testID="login-set-password-button"
        variant="outline"
        size="lg"
        fullWidth
        title={t('auth.setPassword')}
        onPress={f.sendSetPassword}
        isLoading={f.settingPassword}
        disabled={f.settingPassword}
      />
    </View>
  );
}
