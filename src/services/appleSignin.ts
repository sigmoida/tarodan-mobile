import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import i18n from '@/i18n/config';

/**
 * Apple ile giriş bu platformda yapılabilir mi?
 * Buton yalnızca true ise gösterilmeli (yalnız iOS + destekleyen cihaz).
 */
export async function isAppleAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

export interface AppleSignInResult {
  identityToken: string;
  /** Yalnız ilk yetkilendirmede gelir. */
  fullName?: string;
  /**
   * Tek kullanımlık, kısa ömürlü (5 dk) kod. Sunucu bunu Apple'da refresh
   * token'a çevirip saklar ve hesap silmede Apple token'ını iptal eder
   * (Apple 5.1.1(v)). Apple her girişte üretir; gelmezse alan gönderilmez.
   */
  authorizationCode?: string;
}

/**
 * Apple ile giriş; backend'e gönderilecek identityToken (+ ilk seferde fullName,
 * + authorizationCode) döner.
 * Kullanıcı iptal ederse ERR_REQUEST_CANCELED fırlatır (çağıran sessiz geçer).
 */
export async function signInWithApple(): Promise<AppleSignInResult> {
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });
  const identityToken = credential.identityToken;
  // React DIŞI modül — `useTranslation` çağıramaz; `useLogin`'in catch
  // bloğunda `e.message` olarak kullanıcıya gösterilir, o yüzden global
  // `i18n` örneğinden ÇAĞRI ANINDA okunur (bkz. `paytrDirectForm.ts`).
  if (!identityToken) throw new Error(i18n.t('auth.appleIdentityTokenMissing'));
  const parts = [credential.fullName?.givenName, credential.fullName?.familyName].filter(Boolean);
  const fullName = parts.length ? parts.join(' ') : undefined;
  const authorizationCode = credential.authorizationCode ?? undefined;
  return { identityToken, fullName, authorizationCode };
}
