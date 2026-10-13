import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, Text } from '@/ui';
import { styles } from '../_lib/styles';
import type { LoginController } from '../_hooks/useLogin';
import { ResolvedEmail } from './ResolvedEmail';
import { SocialButtons } from './SocialButtons';

/**
 * Adım 2 (alternatif, web "googleOnly"): hesap Google ile açılmış, şifresi yok. Google ile giriş
 * ya da "Şifre belirle" (şifre belirleme bağlantısı e-postaya gider). Apple bu dalda anlamsız
 * (web aynı) — bilinçli olarak yok.
 */
export function GoogleOnlyStep({ f }: { f: LoginController }) {
  const { t } = useTranslation();

  return (
    <View style={styles.form}>
      <ResolvedEmail email={f.email} onChange={f.back} />
      <Text testID="login-google-only-notice" variant="bodySm" tone="body" style={styles.notice}>
        {t('auth.googleOnlyAccount')}
      </Text>
      <SocialButtons f={f} apple={false} />
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
