import i18n from '@/i18n/config';
import { authApi } from '@/lib/api';
import { qk, useAppMutation } from '@/lib/query';

/** 2FA'yı kapat — backend geçerli TOTP kodu ister. Modal KAPANDIKTAN sonra tetiklenir (src/ui/CLAUDE.md › iOS modal rule). */
export function useDoDisableTwoFactor() {
  return useAppMutation((code: string) => authApi.disableTwoFactor(code), {
    invalidates: [qk.user.twoFactorStatus],
    success: () => i18n.t('security.twoFactorDisabled'),
    error: () => i18n.t('profile.twoFactor.disableFailed'),
  });
}
