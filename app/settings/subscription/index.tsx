import { router } from 'expo-router';
import { AuthGatePage } from '@/components/common/AuthGatePage';
import { PageShell } from '@/components/common/PageShell';
import { useSubscription } from './_hooks/useSubscription';
import { SubscriptionBody } from './_components/SubscriptionBody';

/**
 * Subscription settings — THIN screen. The `useSubscription` controller owns the
 * subscription query bindings, cancel/reactivate handlers, and derived status;
 * PageShell renders the loading state, the screen the auth gate and body.
 */
export default function SubscriptionSettingsScreen() {
  const f = useSubscription();
  const title = f.t('mobile.settingsSubscription');

  if (!f.isAuthenticated) {
    return (
      <AuthGatePage
        title={title}
        emptyTitle={f.t('membership.loginRequiredTitle')}
        subtitle={f.t('membership.subscriptionLoginPrompt')}
      />
    );
  }

  return (
    <PageShell
      title={title}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
      loading={f.isLoading && !f.subscription}
    >
      <SubscriptionBody f={f} />
    </PageShell>
  );
}
