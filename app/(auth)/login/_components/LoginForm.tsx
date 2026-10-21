import React from 'react';
import { View } from 'react-native';
import { styles } from '../_lib/styles';
import type { LoginController } from '../_hooks/useLogin';
import { EmailStep } from './EmailStep';
import { PasswordStep } from './PasswordStep';
import { NoPasswordStep } from './NoPasswordStep';

/**
 * Login form (web `LoginForm`, two steps): the e-mail, password or no-password step by `step`.
 * No separate "continue as guest" button: the way out is the always visible back arrow.
 * No frame or card: the title and shell live in `AuthShell`.
 */
export function LoginForm({ f }: { f: LoginController }) {
  return (
    <View style={styles.root}>
      {f.step === 'email' ? <EmailStep f={f} /> : null}
      {f.step === 'password' ? <PasswordStep f={f} /> : null}
      {f.step === 'noPassword' ? <NoPasswordStep f={f} /> : null}
    </View>
  );
}
