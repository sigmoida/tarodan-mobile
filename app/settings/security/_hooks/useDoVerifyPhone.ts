import i18n from '@/i18n/config';
import { authApi } from '@/lib/api';
import { useAppMutation } from '@/lib/query';
import { useAuthStore } from '@/stores/authStore';

/**
 * SMS kodunu doğrula. Doğrulama numarayı da hesaba yazar → kullanıcı tazelenir (hub'daki
 * "Doğrulandı" rozeti store'dan okunur); geri dönüş ekranın işi.
 */
export function useDoVerifyPhone() {
  const refreshUserData = useAuthStore((s) => s.refreshUserData);
  return useAppMutation(
    async (code: string) => {
      await authApi.verifyPhone(code);
      await refreshUserData();
    },
    {
      success: () => i18n.t('profile.phoneVerified'),
      error: () => i18n.t('profile.invalidCode'),
    },
  );
}
