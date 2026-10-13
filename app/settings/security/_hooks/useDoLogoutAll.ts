import { router } from 'expo-router';
import i18n from '@/i18n/config';
import { authApi } from '@/lib/api';
import { useAppMutation } from '@/lib/query';
import { useAuthStore } from '@/stores/authStore';

/** Tüm cihazlardan çıkış (`DELETE /security/tokens`) → yerel oturum kapanır, girişe dönülür. */
export function useDoLogoutAll() {
  const logout = useAuthStore((s) => s.logout);
  return useAppMutation(() => authApi.logoutAll(), {
    error: () => i18n.t('common.operationFailed'),
    onSuccess: () => {
      void logout();
      router.replace('/(auth)/login');
    },
  });
}
