import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { appAlert } from '@/ui';
import { authApi } from '@/lib/api';
import { signInWithGoogle } from '@/services/googleSignin';
import { signInWithApple, isAppleAvailable } from '@/services/appleSignin';
import { useAuthStore, type User } from '@/stores/authStore';

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
 * Google / Apple ile devam et — giriş VE kayıt ekranlarının ortak kontrolcüsü (§5: tek kaynak).
 * İki ekran da aynı uçlara gider (`/auth/google`, `/auth/apple` ilk kullanımda hesap açar),
 * başarıda oturumu açıp ana sayfaya geçer; iptal sessiz, diğer hatalar `appAlert` ile gösterilir.
 * Önceden `useLogin` içindeydi; davranış satır satır aynı taşındı.
 */
export function useSocialSignIn({ onPasswordLoginRequired }: SocialSignInOptions = {}) {
  const { t } = useTranslation();
  const login = useAuthStore((s) => s.login);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    isAppleAvailable().then(setAppleAvailable);
  }, []);

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
    try {
      const idToken = await signInWithGoogle();
      const response = await authApi.loginWithGoogle(idToken);
      if (!(await completeLogin(response.data as SocialLoginResponse))) return;
      router.push('/' as never);
    } catch (e: any) {
      // İptal sessiz geçilir; diğer her hata KULLANICIYA gösterilir (önceden
      // sessiz yutuluyordu → "takılıyor" görüntüsü). Native status code'u da
      // ekle: DEVELOPER_ERROR → Google Cloud'da Android OAuth client/SHA-1 eksik.
      if (e?.code === 'SIGN_IN_CANCELLED' || e?.code === '-5') return;
      if (isTwoFactorPasswordRequired(e)) {
        requirePasswordLogin();
        return;
      }
      const apiMsg = e?.response?.data?.message;
      const detail = apiMsg || e?.message || t('common.unknownError');
      const code = e?.code ? ` (${t('common.errorCodeSuffix', { code: e.code })})` : '';
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
