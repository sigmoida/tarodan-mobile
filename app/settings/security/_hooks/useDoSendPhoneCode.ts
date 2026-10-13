import i18n from '@/i18n/config';
import { authApi } from '@/lib/api';
import { useAppMutation } from '@/lib/query';

/** SMS doğrulama kodu gönder (değer daima E.164). Web `usePhoneVerification.sendCode`. */
export function useDoSendPhoneCode() {
  return useAppMutation((e164: string) => authApi.sendPhoneCode(e164), {
    success: () => i18n.t('profile.codeSent'),
    error: () => i18n.t('profile.sendCodeFailed'),
  });
}
