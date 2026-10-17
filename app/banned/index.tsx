import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert, Button } from '@/ui';
import { GateScreen } from '@/components/common/GateScreen';
import { useAuthStore } from '@/stores/authStore';
import { resetBannedRedirect } from '@/lib/api';
import { navigateTo } from '@/lib/navigation/goTo';
import { useBanStatus } from './_hooks/useBanStatus';

/**
 * Banlı kullanıcı ekranı. API interceptor'ı USER_BANNED (403) yakalayınca
 * buraya yönlendirir; geri navigasyon kapalıdır. Banlı kullanıcı yalnızca
 * destek talebi oluşturabilir veya çıkış yapabilir (backend BannedUserGuard
 * ile aynı izinler).
 *
 * Ban nedeni YALNIZ sunucudan gelir (`useBanStatus`); rota parametresi (`?reason=`)
 * okunmaz — derin bağlantıyla bu ekrana keyfi metin basılamaz. Hesap banlı
 * değilse (derin bağlantıyla gelinmiş) ana sayfaya dönülür.
 */
export default function BannedScreen() {
  const { t } = useTranslation();
  const logout = useAuthStore((s) => s.logout);
  const { data: status } = useBanStatus();
  const reason = status?.banned ? status.reason : null;
  const notBanned = status?.banned === false;

  useEffect(() => {
    if (!notBanned) return;
    // Hesap banlı değil: ban yönlendirme bayrağı bırakılır — sonraki gerçek ban yine yönlendirir.
    resetBannedRedirect();
    navigateTo('/');
  }, [notBanned]);

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
