import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Button, theme } from '@/ui';
import { isGoogleConfigured } from '@/services/googleSignin';
import type { LoginController } from '../_hooks/useLogin';

const { colors } = theme;

/**
 * Google + Apple ile devam et (web `GoogleSignInButton` / `AppleSignInButton`): ikisi de outline.
 * Google yalnız yapılandırılmışsa, Apple yalnız cihaz/platform destekliyorsa (`appleAvailable`)
 * çizilir — iOS dışı ya da desteksiz cihazda düğme hiç görünmez. Marka logoları dekoratif ikon
 * kuralının istisnasıdır (web aynı yerde logo gösterir).
 */
export function SocialButtons({
  f,
  apple = true,
}: {
  f: LoginController;
  /** Google-only dalında Apple anlamsız (web aynı) — `false`. */
  apple?: boolean;
}) {
  const { t } = useTranslation();
  const busy = f.loginMutation.isPending || f.googleLoading || f.appleLoading;

  return (
    <>
      {isGoogleConfigured() ? (
        <Button
          testID="login-google-button"
          variant="outline"
          size="lg"
          fullWidth
          // eslint-disable-next-line tarodan/restrict-button-icon
          leftIcon={<Ionicons name="logo-google" size={theme.iconSize.md} color={colors.text.body} />}
          title={f.googleLoading ? t('auth.signingIn') : t('auth.continueWithGoogle')}
          accessibilityLabel={t('auth.continueWithGoogle')}
          onPress={f.handleGoogle}
          isLoading={f.googleLoading}
          disabled={busy}
        />
      ) : null}

      {apple && f.appleAvailable ? (
        <Button
          testID="login-apple-button"
          variant="outline"
          size="lg"
          fullWidth
          // eslint-disable-next-line tarodan/restrict-button-icon
          leftIcon={<Ionicons name="logo-apple" size={theme.iconSize.md} color={colors.text.body} />}
          title={f.appleLoading ? t('auth.signingIn') : t('auth.continueWithApple')}
          accessibilityLabel={t('auth.continueWithApple')}
          onPress={f.handleApple}
          isLoading={f.appleLoading}
          disabled={busy}
        />
      ) : null}
    </>
  );
}
