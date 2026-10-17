import { router } from 'expo-router';
import { PageShell } from '@/components/common/PageShell';

import { useBusinessStats } from './_hooks/useBusinessStats';
import { BusinessSkeleton } from './_components/BusinessSkeleton';
import {
  BusinessCompanyHeader,
  BusinessTabs,
  BusinessTabContent,
} from './_components/BusinessSections';

/**
 * Business dashboard — THIN screen. The `useBusinessStats` controller owns the
 * stats fetch, auth redirect, and tab state; PageShell renders the loading/error
 * states and the screen composes the company header, tabs, and tab content.
 */
export default function BusinessDashboardScreen() {
  const f = useBusinessStats();
  const onBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'));
  const needsCompanyName = !!f.error && (f.error.includes('şirket adı') || f.error.includes('companyName'));

  return (
    <PageShell
      title={f.t('mobile.settingsBusiness')}
      onBack={onBack}
      loading={f.loading}
      loadingFallback={<BusinessSkeleton />}
      empty={!!f.error}
      // Hata durumunda eylem: şirket adı eksikse profile, değilse işletme hesabı açmaya.
      emptyState={{
        icon: 'exclamation-circle',
        title: f.error ?? '',
        subtitle: f.t('emptyState.businessErrorHint'),
        actionLabel: needsCompanyName ? f.t('business.addCompanyName') : f.t('seller.openBusinessAccount'),
        onAction: () =>
          needsCompanyName ? router.push('/settings/edit-profile') : router.push('/seller/register'),
      }}
    >
      <BusinessCompanyHeader f={f} />
      <BusinessTabs f={f} />
      <BusinessTabContent f={f} />
    </PageShell>
  );
}
