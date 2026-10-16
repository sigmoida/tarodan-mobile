import { router } from 'expo-router';
import i18n from '@/i18n/config';
import { authApi } from '@/lib/api';
import { useAppMutation } from '@/lib/query';
import { registerForPushNotifications } from '@/services/push';
import { settlePendingPushRevoke, startPushRevoke } from '@/services/pushRevocation';
import { useAuthStore } from '@/stores/authStore';

/**
 * Tüm cihazlardan çıkış (`DELETE /security/tokens`) → yerel oturum kapanır, girişe dönülür.
 *
 * Bu cihazın push token'ı iptalden ÖNCE deaktive edilir ve sonuçlanması beklenir (en çok 5 sn;
 * aşarsa istek iptal edilir — `@/services/pushRevocation`). Tüm oturumlar iptal edilemezse
 * oturum sürer — push yeniden kaydedilir (iptal artık sunucuya ulaşamayacağı için sonra gelip
 * yeni kaydı kapatamaz).
 */
export function useDoLogoutAll() {
  const logout = useAuthStore((s) => s.logout);
  return useAppMutation(
    async () => {
      void startPushRevoke();
      await settlePendingPushRevoke();
      try {
        return await authApi.logoutAll();
      } catch (error) {
        void registerForPushNotifications().catch(() => undefined);
        throw error;
      }
    },
    {
      error: () => i18n.t('common.operationFailed'),
      onSuccess: () => {
        void logout();
        router.replace('/(auth)/login');
      },
    },
  );
}
