import i18n from '@/i18n/config';
import { authApi } from '@/lib/api';
import { qk, useAppMutation } from '@/lib/query';
import { extractBackupCodes } from '../_lib/types';

/** Yeni yedek kodlar (eskiler geçersiz olur) — backend geçerli TOTP kodu ister. */
export function useDoRegenerateBackupCodes() {
  return useAppMutation(
    async (code: string) => extractBackupCodes((await authApi.regenerateBackupCodes(code)).data),
    {
      invalidates: [qk.user.twoFactorStatus],
      error: () => i18n.t('profile.twoFactor.regenerateFailed'),
      // Gizli anahtar / yedek kodlar MutationCache'te (varsayılan 5 dk) tutulmasın.
      mutation: { gcTime: 0 },
    },
  );
}
