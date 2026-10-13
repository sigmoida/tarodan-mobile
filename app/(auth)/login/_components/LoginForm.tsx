import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button } from '@/ui';
import { styles } from '../_lib/styles';
import type { LoginController } from '../_hooks/useLogin';
import { EmailStep } from './EmailStep';
import { PasswordStep } from './PasswordStep';
import { GoogleOnlyStep } from './GoogleOnlyStep';

/**
 * Giriş formu (web `LoginForm`, iki aşamalı): `step`e göre e-posta / şifre / Google-only adımı,
 * altında her adımda misafir devam yolu. Çerçeve/kart yok — başlık ve kabuk `AuthShell`'de.
 */
export function LoginForm({ f }: { f: LoginController }) {
  const { t } = useTranslation();

  return (
    <View style={styles.root}>
      {f.step === 'email' ? <EmailStep f={f} /> : null}
      {f.step === 'password' ? <PasswordStep f={f} /> : null}
      {f.step === 'googleOnly' ? <GoogleOnlyStep f={f} /> : null}

      <Button
        testID="continue-as-guest-button"
        variant="ghost"
        size="lg"
        fullWidth
        title={t('auth.continueAsGuest')}
        onPress={f.continueAsGuest}
        disabled={f.loginMutation.isPending}
      />
    </View>
  );
}
