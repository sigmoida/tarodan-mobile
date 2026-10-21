import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { appAlert } from '@/ui';
import { authApi } from '@/lib/api';
import { signInWithGoogle } from '@/services/googleSignin';
import { isGoogleCancel, isGoogleDeveloperError } from '@/services/googleSigninErrors';
import { captureException } from '@/services/sentry';
import { signInWithApple } from '@/services/appleSignin';
import { useAuthStore, type User } from '@/stores/authStore';
import { useAppleAvailability } from './useAppleAvailability';

/**
 * Sunucu sözleşmesi (`SocialLoginService.buildUserAuthResponse`): 2FA'sı açık hesap Google/Apple
 * ile token ALAMAZ — `401 { errorCode: 'TWO_FACTOR_PASSWORD_REQUIRED' }` döner; ikinci adım yalnız
 * parola girişinde var (`POST /auth/login` + `twoFactorCode`). Bu yüzden kullanıcı parola
 * girişinin e-posta adımına alınır; 2FA kodu, parola girişiyle AYNI adımda istenir. Web sosyal
 * girişte `2fa` durumunu ayrı bir hata olarak ayırır (`twoFactorRequired`); `200 + requires2FA`
 * (ileride sosyal uçlar da dönerse) burada da aynı şekilde ele alınır — "beklenmeyen yanıt"
 * hatası gösterilmez.
 */
export const TWO_FACTOR_PASSWORD_REQUIRED = 'TWO_FACTOR_PASSWORD_REQUIRED';

function isTwoFactorPasswordRequired(error: unknown): boolean {
  const data = (error as { response?: { data?: { errorCode?: unknown } } } | null)?.response?.data;
  return data?.errorCode === TWO_FACTOR_PASSWORD_REQUIRED;
}

interface SocialSignInOptions {
  /**
   * 2FA'lı hesap sosyal girişle açılamadı: parola + 2FA adımına geçiş. Verilmezse giriş ekranına
   * gidilir (kayıt ekranı); giriş ekranı kendi e-posta adımına döner.
   */
  onPasswordLoginRequired?: () => void;
}

type SocialLoginResponse = {
  requires2FA?: boolean;
  tokens?: { accessToken?: string; refreshToken?: string };
  accessToken?: string;
  refreshToken?: string;
  user?: User;
} | null | undefined;

/**
 * Google / Apple ile devam et — giriş VE kayıt ekranlarının ortak kontrolcüsü (CLAUDE.md › Principles: tek kaynak).
 * İki ekran da aynı uçlara gider (`/auth/google`, `/auth/apple` ilk kullanımda hesap açar),
 * başarıda oturumu açıp ana sayfaya geçer; iptal sessiz, diğer hatalar `appAlert` ile gösterilir.
 * Önceden `useLogin` içindeydi; davranış satır satır aynı taşındı.
 */
export function useSocialSignIn({ onPasswordLoginRequired }: SocialSignInOptions = {}) {
  const { t } = useTranslation();
  const login = useAuthStore((s) => s.login);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const appleAvailable = useAppleAvailability();

  /** 2FA'lı hesap: açıklama + parola adımına geçiş (dialog kapandıktan sonra). */
  const requirePasswordLogin = () => {
    appAlert(t('auth.socialTwoFactorTitle'), t('auth.socialTwoFactorBody'), [
      {
        text: t('common.ok'),
        onPress: () => {
          if (onPasswordLoginRequired) onPasswordLoginRequired();
          else router.replace('/(auth)/login');
        },
      },
    ]);
  };

  /** Sosyal giriş yanıtını oturuma çevirir; `false` → akış burada bitti (hata/2FA gösterildi). */
  const completeLogin = async (data: SocialLoginResponse): Promise<boolean> => {
    if (data?.requires2FA === true) {
      requirePasswordLogin();
      return false;
    }
    const accessToken = data?.tokens?.accessToken || data?.accessToken;
    const refreshToken = data?.tokens?.refreshToken || data?.refreshToken;
    if (!accessToken) {
      appAlert(t('common.error'), t('auth.unexpectedLoginResponse'));
      return false;
    }
    // Token'lı yanıt kullanıcıyı da taşır (eski davranış: doğrudan geçirilirdi).
    await login(accessToken, data?.user as User, refreshToken);
    return true;
  };

  const handleGoogle = async () => {
    if (googleLoading) return;
    setGoogleLoading(true);
    // Native errors are told apart from API errors: a native code (e.g. DEVELOPER_ERROR = 10)
    // must not be matched against an error from `authApi.loginWithGoogle`.
    let nativeStep = true;
    try {
      const idToken = await signInWithGoogle();
      nativeStep = false;
      const response = await authApi.loginWithGoogle(idToken);
      if (!(await completeLogin(response.data as SocialLoginResponse))) return;
      router.push('/' as never);
    } catch (e: any) {
      // Cancellation is silent; every other error is SHOWN to the user (swallowing it
      // used to look like a hang). The native status code is appended.
      if (isGoogleCancel(e)) return;
      if (isTwoFactorPasswordRequired(e)) {
        requirePasswordLogin();
        return;
      }
      const code = e?.code ? ` (${t('common.errorCodeSuffix', { code: e.code })})` : '';
      // DEVELOPER_ERROR = the Android OAuth client / signing SHA-1 is missing in Google
      // Cloud. The raw native text is useless to the user: show a readable message (with the
      // code, for support) and report it, because the fix is on our side
      // (docs/ANDROID_RELEASE.md, section 9). The native error carries no user data.
      if (nativeStep && isGoogleDeveloperError(e)) {
        captureException(e, {
          level: 'error',
          tags: { flow: 'auth.google', reason: 'developer_error', code: String(e?.code ?? '') },
        });
        appAlert(t('auth.googleSignInFailedTitle'), `${t('mobile.googleDeveloperError')}${code}`);
        return;
      }
      const apiMsg = e?.response?.data?.message;
      const detail = apiMsg || e?.message || t('common.unknownError');
      appAlert(t('auth.googleSignInFailedTitle'), `${detail}${code}`);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleApple = async () => {
    if (appleLoading) return;
    setAppleLoading(true);
    try {
      const response = await authApi.loginWithApple(await signInWithApple());
      if (!(await completeLogin(response.data as SocialLoginResponse))) return;
      router.push('/' as never);
    } catch (e: any) {
      // Kullanıcı iptali sessiz geçilir.
      if (e?.code === 'ERR_REQUEST_CANCELED') return;
      if (isTwoFactorPasswordRequired(e)) {
        requirePasswordLogin();
        return;
      }
      const apiMsg = e?.response?.data?.message;
      const detail = apiMsg || e?.message || t('common.unknownError');
      const code = e?.code ? ` (${t('common.errorCodeSuffix', { code: e.code })})` : '';
      appAlert(t('auth.appleSignInFailedTitle'), `${detail}${code}`);
    } finally {
      setAppleLoading(false);
    }
  };

  return { googleLoading, appleLoading, appleAvailable, handleGoogle, handleApple };
}
