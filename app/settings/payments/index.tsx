import { ScrollView } from 'react-native';
import { Chip, EmptyState } from '@/ui';
import { useTranslation } from 'react-i18next';
import { AuthGatePage } from '@/components/common/AuthGatePage';
import { PageShell } from '@/components/common/PageShell';
import { RowListSkeleton } from '@/components/common/RowListSkeleton';
import { usePayments } from './_hooks/usePayments';
import { styles } from './_lib/styles';
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
      refreshing={f.paymentsQuery.isFetching && !f.paymentsQuery.isLoading}
      onRefresh={() => f.paymentsQuery.refetch()}
    >
      {/* Status filtresi */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {statusOptions.map((opt) => (
          <Chip
            key={opt.value || 'all'}
            label={opt.label}
            variant="primary"
            selected={f.statusFilter === opt.value}
            onPress={() => f.setStatusFilter(opt.value)}
          />
        ))}
      </ScrollView>

      {f.payments.length === 0 ? (
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
