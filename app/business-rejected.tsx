import { Stack, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Text } from '@/ui';
import { GateScreen } from '@/components/common/GateScreen';
import { useAuthStore } from '@/stores/authStore';
import { useBusinessGateExit } from '@/hooks/useBusinessGateExit';

/**
 * Kurumsal başvuru reddedildi ekranı. Web karşılığı:
 * apps/web/src/app/business-rejected/page.tsx. BusinessMembershipGuard,
 * businessStatus === 'rejected' olan kurumsal hesapları buraya kilitler;
 * yalnızca bu ekran, /contact, /login ve çıkış serbesttir.
 */
export default function BusinessRejectedScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  // Başvuru artık reddedilmiş değilse (bayat görüntü / yeniden başvuru onaylandı) kapıdan çık.
  useBusinessGateExit('rejected');

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <GateScreen
      icon="x-circle"
      title={t('businessGuard.rejectedTitle')}
      description={t('businessGuard.rejectedBody', { company: user?.companyName ?? '' })}
      actions={
        <>
          <Button
            testID="business-rejected-continue"
            variant="primary"
            fullWidth
            title={t('businessGuard.rejectedFixCta')}
            onPress={() => router.push('/settings/business-application' as never)}
          />
          <Button
            variant="outline"
            fullWidth
            title={t('businessGuard.contactSupport')}
            onPress={() => router.push('/contact')}
          />
          <Button variant="ghost" fullWidth title={t('common.logout')} onPress={handleLogout} />
        </>
      }
    >
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <Text variant="bodySm" tone="muted" align="center">
        {t('businessGuard.rejectedSubText', { email: user?.email ?? '' })}
      </Text>
      <Alert variant="danger">{t('businessGuard.rejectedInfoText')}</Alert>
    </GateScreen>
  );
}
