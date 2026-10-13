import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { PageShell } from '@/components/common/PageShell';

import { useRefundRequests } from './_hooks/useRefundRequests';
import { RefundList, RefundSellerNote, RefundTabs } from './_components/RefundSections';

/**
 * İade talepleri — İNCE ekran: PageShell + sekmeler + liste.
 *
 * İki sekme: "Taleplerim" (`/refund-requests/me`) ve "Bana Açılanlar"
 * (`/refund-requests/seller`). İkincisi salt okunur; gerekçesi
 * `_components/RefundSections.tsx` → `RefundSellerNote`'ta.
 */
export default function RefundRequestsScreen() {
  const { t } = useTranslation();
  const f = useRefundRequests();
  const back = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'));

  if (!f.isAuthenticated) {
    return (
      <PageShell
        title={t('mobile.quickRefundRequests')}
        onBack={back}
        empty
        emptyState={{
          icon: 'receipt-percent',
          title: t('order.myRefundRequests'),
          subtitle: t('refund.authGateSubtitle'),
          actionLabel: t('common.login'),
          onAction: () => router.push('/(auth)/login'),
        }}
      />
    );
  }

  return (
    <PageShell
      title={t('mobile.quickRefundRequests')}
      onBack={back}
      refreshing={f.refreshing}
      onRefresh={f.onRefresh}
    >
      <RefundTabs f={f} />
      <RefundSellerNote f={f} />
      <RefundList f={f} />
    </PageShell>
  );
}
