import { Stack, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Text } from '@/ui';
import { GateScreen } from '@/components/common/GateScreen';
import { useAuthStore } from '@/stores/authStore';

/**
 * Kurumsal başvuru onay sürecinde ekranı. Web karşılığı:
 * apps/web/src/app/business-pending/page.tsx. BusinessMembershipGuard,
 * businessStatus === 'pending' olan kurumsal hesapları buraya kilitler;
 * yalnızca bu ekran, /contact ve çıkış serbesttir.
 */
export default function BusinessPendingScreen() {
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <GateScreen
      icon="time-outline"
      title={t('businessGuard.pendingTitle')}
      description={t('businessGuard.pendingBody', { company: user?.companyName ?? '' })}
      actions={
        <>
          <Button
            testID="business-pending-continue"
            variant="primary"
            fullWidth
            title={t('businessGuard.pendingContinueCta')}
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
        {t('businessGuard.pendingSubText', { email: user?.email ?? '' })}
      </Text>
      <Alert variant="warning" title={t('businessGuard.pendingInfoTitle')}>
        {`${t('businessGuard.pendingStep1')}\n${t('businessGuard.pendingStep2')}\n${t('businessGuard.pendingStep3')}`}
      </Alert>
    </GateScreen>
  );
}
