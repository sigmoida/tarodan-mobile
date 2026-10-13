import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert, Button } from '@/ui';
import { GateScreen } from '@/components/common/GateScreen';
import { useAuthStore } from '@/stores/authStore';
import { resetBannedRedirect } from '@/lib/api';

/**
 * Banlı kullanıcı ekranı. API interceptor'ı USER_BANNED (403) yakalayınca
 * buraya yönlendirir; geri navigasyon kapalıdır. Banlı kullanıcı yalnızca
 * destek talebi oluşturabilir veya çıkış yapabilir (backend BannedUserGuard
 * ile aynı izinler).
 */
export default function BannedScreen() {
  const { t } = useTranslation();
  const { reason } = useLocalSearchParams<{ reason?: string }>();
  const { logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    resetBannedRedirect();
    router.replace('/(auth)/login');
  };

  return (
    <GateScreen
      icon="no-symbol"
      title={t('mobile.bannedTitle')}
      description={t('mobile.bannedDescription')}
      actions={
        <>
          <Button
            variant="primary"
            fullWidth
            title={t('mobile.bannedCreateSupport')}
            onPress={() => router.push('/support')}
          />
          <Button variant="outline" fullWidth title={t('common.logout')} onPress={handleLogout} />
        </>
      }
    >
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      {reason ? (
        <Alert variant="danger" title={t('mobile.bannedReasonLabel')}>
          {reason}
        </Alert>
      ) : null}
    </GateScreen>
  );
}
