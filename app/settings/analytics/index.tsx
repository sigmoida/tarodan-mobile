import { router } from 'expo-router';
import { AuthGatePage } from '@/components/common/AuthGatePage';
import { PageShell } from '@/components/common/PageShell';
import { useAnalytics } from './_hooks/useAnalytics';
import { AnalyticsContent } from './_components/AnalyticsContent';
import { AnalyticsSkeleton } from './_components/AnalyticsSkeleton';

/**
 * Seller analytics — THIN screen. The `useAnalytics` controller owns the query,
 * focus refresh, and premium/auth flags; PageShell renders the loading / error
 * states, the screen the auth gate and the analytics content.
 */
export default function AnalyticsScreen() {
  const f = useAnalytics();
  const title = f.t('mobile.settingsAnalytics');

  if (!f.isAuthenticated) {
    return (
      <AuthGatePage
        title={title}
        emptyTitle={f.t('analytics.analytics')}
        icon="chart-bar"
        subtitle={f.t('analytics.authGateSubtitle')}
      />
    );
  }

  return (
    <PageShell
      title={title}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
      loading={f.isLoading}
      loadingFallback={<AnalyticsSkeleton />}
      empty={!f.isLoading && !f.analytics}
      emptyState={{ icon: 'chart-bar', title: f.t('analytics.dataLoadFailed'), subtitle: f.t('emptyState.loadFailedHint') }}
      refreshing={f.refreshing}
      onRefresh={f.onRefresh}
    >
      <AnalyticsContent f={f} />
    </PageShell>
  );
}
