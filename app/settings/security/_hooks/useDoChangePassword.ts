import i18n from '@/i18n/config';
import { authApi } from '@/lib/api';
import { useAppMutation } from '@/lib/query';

/** Şifre değiştir (web `useChangePassword`): başarı/hata toast'ı burada; ekran yalnız geri döner. */
export function useDoChangePassword() {
  return useAppMutation(
    ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      authApi.changePassword(currentPassword, newPassword),
    {
      success: () => i18n.t('settings.passwordChanged'),
      error: () => i18n.t('security.passwordChangeFailed'),
    },
  );
}
