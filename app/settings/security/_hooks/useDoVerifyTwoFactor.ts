import i18n from '@/i18n/config';
import { authApi } from '@/lib/api';
import { qk, useAppMutation } from '@/lib/query';
import { extractBackupCodes } from '../_lib/types';

/**
 * Kurulum kodunu doğrula → 2FA açılır. Yanıttaki yedek kodları döndürür (yoksa boş dizi; ekran
 * kurulum yanıtındakilere düşer — web `use2FA.verify` ile aynı).
 */
export function useDoVerifyTwoFactor() {
  return useAppMutation(
    async (code: string) => extractBackupCodes((await authApi.verifyTwoFactor(code)).data),
    {
      invalidates: [qk.user.twoFactorStatus],
      success: () => i18n.t('security.twoFactorEnabled'),
      error: () => i18n.t('profile.twoFactor.verifyFailed'),
      // Gizli anahtar / yedek kodlar MutationCache'te (varsayılan 5 dk) tutulmasın.
      mutation: { gcTime: 0 },
    },
  );
}
