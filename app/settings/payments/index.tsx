import { ChipTabs, EmptyState, ErrorState } from '@/ui';
import { useTranslation } from 'react-i18next';
import { AuthGatePage } from '@/components/common/AuthGatePage';
import { PageShell } from '@/components/common/PageShell';
import { RowListSkeleton } from '@/components/common/RowListSkeleton';
import { usePayments } from './_hooks/usePayments';
import { buildStatusOptions } from './_lib/status';
import { PaymentCard } from './_components/PaymentCard';

/**
 * Ödemelerim — PageShell (Skeleton, çekip yenileme) + durum filtre çipleri + ödeme kartları.
 * Sorgu/filtre/iptal `usePayments`, yeniden deneme `useDoRetryPayment`'ta; bilgi mesajları toast.
 */
export default function PaymentsScreen() {
  const { t } = useTranslation();
  const f = usePayments();
  const statusOptions = buildStatusOptions(t);
  const title = t('mobile.settingsPayments');

  if (!f.isAuthenticated) {
    return (
      <AuthGatePage
        title={title}
        icon="lock-closed"
        subtitle={t('payment.myPaymentsLoginSubtitle')}
      />
    );
  }

  return (
    <PageShell
      title={title}
      loading={f.paymentsQuery.isLoading}
      loadingFallback={<RowListSkeleton rows={4} />}
      refreshing={f.refreshing}
      onRefresh={f.onRefresh}
    >
      {/* Status filtresi */}
      <ChipTabs
        testID="payment-filters"
        value={f.statusFilter}
        onChange={f.setStatusFilter}
        items={statusOptions.map((opt) => ({ key: opt.value, label: opt.label }))}
      />

      {f.paymentsQuery.isError && f.payments.length === 0 ? (
        // Hata "ödeme yok" gibi görünmesin; filtre çipleri yerinde kalır.
        <ErrorState onRetry={() => f.paymentsQuery.refetch()} />
      ) : f.payments.length === 0 ? (
        <EmptyState
          icon="credit-card"
          title={t('payment.noPaymentsTitle')}
          subtitle={
            f.statusFilter
              ? t('payment.noPaymentsFilteredSubtitle')
              : t('payment.noPaymentsSubtitle')
          }
        />
      ) : (
        f.payments.map((p) => <PaymentCard key={p.id} p={p} f={f} />)
      )}
    </PageShell>
  );
}
