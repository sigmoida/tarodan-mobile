import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Button, theme } from '@/ui';
import { isGoogleConfigured } from '@/services/googleSignin';
import type { useSocialSignIn } from '@/hooks/useSocialSignIn';

const { colors } = theme;

export interface SocialButtonsProps {
  social: ReturnType<typeof useSocialSignIn>;
  /** Başka bir işlem sürerken (ör. şifreyle giriş) iki düğmeyi de kilitler. */
  busy?: boolean;
  /** Google-only dalında Apple anlamsız (web aynı) — `false`. */
  apple?: boolean;
  /** testID öneki: `login` → `login-google-button` / `login-apple-button`. */
  testIDPrefix: 'login' | 'register';
}

/**
 * Google + Apple ile devam et (web `GoogleSignInButton` / `AppleSignInButton`): ikisi de outline.
 * Google yalnız yapılandırılmışsa, Apple yalnız cihaz/platform destekliyorsa (`appleAvailable`)
 * çizilir — iOS dışı ya da desteksiz cihazda düğme hiç görünmez. Marka logoları dekoratif ikon
 * kuralının istisnasıdır (web aynı yerde logo gösterir). Giriş ve kayıt ekranlarının ortak
 * düğmeleri (§5).
 */
export function SocialButtons({ social, busy = false, apple = true, testIDPrefix }: SocialButtonsProps) {
  const { t } = useTranslation();
  const locked = busy || social.googleLoading || social.appleLoading;

  return (
    <>
      {isGoogleConfigured() ? (
        <Button
          testID={`${testIDPrefix}-google-button`}
          variant="outline"
          size="lg"
          fullWidth
          // eslint-disable-next-line tarodan/restrict-button-icon
          leftIcon={<Ionicons name="logo-google" size={theme.iconSize.md} color={colors.text.body} />}
          title={social.googleLoading ? t('auth.signingIn') : t('auth.continueWithGoogle')}
          accessibilityLabel={t('auth.continueWithGoogle')}
          onPress={social.handleGoogle}
          isLoading={social.googleLoading}
          disabled={locked}
        />
      ) : null}

      {apple && social.appleAvailable ? (
        <Button
          testID={`${testIDPrefix}-apple-button`}
          variant="outline"
          size="lg"
          fullWidth
          // eslint-disable-next-line tarodan/restrict-button-icon
          leftIcon={<Ionicons name="logo-apple" size={theme.iconSize.md} color={colors.text.body} />}
          title={social.appleLoading ? t('auth.signingIn') : t('auth.continueWithApple')}
          accessibilityLabel={t('auth.continueWithApple')}
          onPress={social.handleApple}
          isLoading={social.appleLoading}
          disabled={locked}
        />
      ) : null}
    </>
  );
}
