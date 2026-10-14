import React from 'react';
import { View } from 'react-native';
import { styles } from '../_lib/styles';
import type { LoginController } from '../_hooks/useLogin';
import { EmailStep } from './EmailStep';
import { PasswordStep } from './PasswordStep';
import { GoogleOnlyStep } from './GoogleOnlyStep';

/**
 * Giriş formu (web `LoginForm`, iki aşamalı): `step`e göre e-posta / şifre / Google-only adımı.
 * Ayrı "misafir olarak devam et" düğmesi yok — çıkış yolu üst bardaki (her zaman görünen) geri oku.
 * Çerçeve/kart yok — başlık ve kabuk `AuthShell`'de.
 */
export function LoginForm({ f }: { f: LoginController }) {
  return (
    <View style={styles.root}>
      {f.step === 'email' ? <EmailStep f={f} /> : null}
      {f.step === 'password' ? <PasswordStep f={f} /> : null}
      {f.step === 'googleOnly' ? <GoogleOnlyStep f={f} /> : null}
    </View>
  );
}
