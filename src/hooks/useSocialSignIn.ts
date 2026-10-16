import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { appAlert } from '@/ui';
import { authApi } from '@/lib/api';
import { signInWithGoogle } from '@/services/googleSignin';
import { signInWithApple, isAppleAvailable } from '@/services/appleSignin';
import { useAuthStore } from '@/stores/authStore';

/**
 * Google / Apple ile devam et — giriş VE kayıt ekranlarının ortak kontrolcüsü (§5: tek kaynak).
 * İki ekran da aynı uçlara gider (`/auth/google`, `/auth/apple` ilk kullanımda hesap açar),
 * başarıda oturumu açıp ana sayfaya geçer; iptal sessiz, diğer hatalar `appAlert` ile gösterilir.
 * Önceden `useLogin` içindeydi; davranış satır satır aynı taşındı.
 */
export function useSocialSignIn() {
  const { t } = useTranslation();
  const login = useAuthStore((s) => s.login);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    isAppleAvailable().then(setAppleAvailable);
  }, []);

  const handleGoogle = async () => {
    if (googleLoading) return;
    setGoogleLoading(true);
    try {
      const idToken = await signInWithGoogle();
      const response = await authApi.loginWithGoogle(idToken);
      const data = response.data as any;
      const accessToken = data.tokens?.accessToken || data.accessToken;
      const refreshToken = data.tokens?.refreshToken || data.refreshToken;
      const user = data.user;
      if (!accessToken) {
        appAlert(t('common.error'), t('auth.unexpectedLoginResponse'));
        return;
      }
      await login(accessToken, user, refreshToken);
      router.push('/' as never);
    } catch (e: any) {
      // İptal sessiz geçilir; diğer her hata KULLANICIYA gösterilir (önceden
      // sessiz yutuluyordu → "takılıyor" görüntüsü). Native status code'u da
      // ekle: DEVELOPER_ERROR → Google Cloud'da Android OAuth client/SHA-1 eksik.
      if (e?.code === 'SIGN_IN_CANCELLED' || e?.code === '-5') return;
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
      const data = response.data as any;
      const accessToken = data.tokens?.accessToken || data.accessToken;
      const refreshToken = data.tokens?.refreshToken || data.refreshToken;
      const user = data.user;
      if (!accessToken) {
        appAlert(t('common.error'), t('auth.unexpectedLoginResponse'));
        return;
      }
      await login(accessToken, user, refreshToken);
      router.push('/' as never);
    } catch (e: any) {
      // Kullanıcı iptali sessiz geçilir.
      if (e?.code === 'ERR_REQUEST_CANCELED') return;
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
