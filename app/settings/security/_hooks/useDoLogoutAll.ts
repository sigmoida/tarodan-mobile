import { router } from 'expo-router';
import i18n from '@/i18n/config';
import { authApi } from '@/lib/api';
import { readAccessToken } from '@/lib/api/tokenStorage';
import { useAppMutation } from '@/lib/query';
import { registerForPushNotifications, unregisterPushNotifications } from '@/services/push';
import { useAuthStore } from '@/stores/authStore';
import { withTimeout } from '@/utils/withTimeout';

/** Push iptalinin üst sınırı — tüm cihazlardan çıkış bundan uzun bekletilmez. */
const PUSH_REVOKE_TIMEOUT_MS = 5000;

/**
 * Tüm cihazlardan çıkış (`DELETE /security/tokens`) → yerel oturum kapanır, girişe dönülür.
 *
 * Bu cihazın push token'ı iptalden ÖNCE, oturum token'ı hâlâ geçerliyken deaktive edilir
 * (en iyi çaba, süre sınırlı): sunucu tüm oturumları iptal ettikten sonra bu istek
 * reddedilebilir ve çıkış yapılmış cihaza bildirim gitmeye devam ederdi. İptal başarısız
 * olursa oturum sürer — push yeniden kaydedilir.
 */
export function useDoLogoutAll() {
  const logout = useAuthStore((s) => s.logout);
  return useAppMutation(
    async () => {
      const accessToken = await readAccessToken().catch(() => null);
      await withTimeout(unregisterPushNotifications(accessToken), PUSH_REVOKE_TIMEOUT_MS);
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
