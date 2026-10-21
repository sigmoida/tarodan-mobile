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
 * Step 2 (alternative, web `googleOnly`): the account has no password. Sign in with the
 * provider linked to it (Google, or Apple on iOS; the client does not know which one, so both
 * buttons this device can show are offered, as on web), or "Set a password" (the link goes to
 * the e-mail). The notice claims nothing about how the account was created (plan D5). Where no
 * provider button renders (Android while Google is off) the notice only offers the password.
 */
export function NoPasswordStep({ f }: { f: LoginController }) {
  const { t } = useTranslation();
  const hasProvider = getVisibleSocialProviders(f.social).any;

  return (
    <View style={styles.form}>
      <ResolvedEmail email={f.email} onChange={f.back} />
      <Text testID="login-no-password-notice" variant="bodySm" tone="body" style={styles.notice}>
        {t(hasProvider ? 'auth.noPasswordAccount' : 'mobile.noPasswordAccountNoProvider')}
      </Text>
      <SocialButtons social={f.social} busy={f.loginMutation.isPending} testIDPrefix="login" />
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
