import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { Button, theme } from '@/ui';
import { isGoogleConfigured } from '@/services/googleSignin';
import type { useSocialSignIn } from '@/hooks/useSocialSignIn';

const { colors } = theme;

/**
 * Marka logoları: yalnız bu iki glif için tüm vector-icons font paketini yüklemek yerine
 * satır içi SVG (24 viewBox). Google "G" resmi dört renkli işaret; Apple tek renk (gövde rengi).
 */
const { google } = colors.brand;
const GOOGLE_PATHS: ReadonlyArray<readonly [string, string]> = [
  ['M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z', google.blue],
  ['M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z', google.green],
  ['M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z', google.yellow],
  ['M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z', google.red],
];

const APPLE_PATH =
  'M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701';

function GoogleMark({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {GOOGLE_PATHS.map(([d, fill]) => (
        <Path key={fill} d={d} fill={fill} />
      ))}
    </Svg>
  );
}

function AppleMark({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Path d={APPLE_PATH} fill={color} />
    </Svg>
  );
}

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
 * düğmeleri (CLAUDE.md › Principles).
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
          leftIcon={<GoogleMark size={theme.iconSize.md} />}
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
          leftIcon={<AppleMark size={theme.iconSize.md} color={colors.text.body} />}
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
