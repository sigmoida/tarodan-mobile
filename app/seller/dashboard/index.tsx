import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { PageShell } from '@/components/common/PageShell';
import { useSellerDashboard } from './_hooks/useSellerDashboard';
import {
  WelcomeCard,
  StatsGrid,
  QuickActions,
  SummaryCard,
} from './_components/DashboardSections';

/** Satıcı panosu — PageShell (Skeleton / çekip yenileme / misafir) + SectionCard bölümleri. */
export default function SellerDashboardScreen() {
  const { t } = useTranslation();
  const f = useSellerDashboard();
  const title = t('sellerDashboard.title');

  if (!f.isAuthenticated) {
    return (
      <PageShell
        title={title}
        empty
        emptyState={{
          icon: 'building-storefront',
          title: t('sellerDashboard.loginPrompt'),
          subtitle: t('emptyState.loginRequiredHint'),
          actionLabel: t('common.login'),
          onAction: () => router.push('/(auth)/login'),
        }}
      />
    );
  }

  return (
    <PageShell
      title={title}
      subtitle={f.user?.displayName}
      loading={f.isLoading}
      refreshing={f.refreshing}
      onRefresh={f.refresh}
    >
      <WelcomeCard f={f} />
      <StatsGrid f={f} />
      <QuickActions />
      <SummaryCard f={f} />
    </PageShell>
  );
}
