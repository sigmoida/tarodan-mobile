import { FlatList } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { EmptyState, pageListContentStyle } from '@/ui';
import { AuthGatePage } from '@/components/common/AuthGatePage';
import { PageShell } from '@/components/common/PageShell';
import { RowListSkeleton } from '@/components/common/RowListSkeleton';
import { usePaymentHistory } from './_hooks/usePaymentHistory';
import { PaymentHistoryItem } from './_components/PaymentHistoryItem';

/** Ödeme geçmişi — PageShell (Skeleton) + web Card satırları; boşken EmptyState. */
export default function PaymentHistoryScreen() {
  const { t } = useTranslation();
  const f = usePaymentHistory();
  const title = t('mobile.settingsPaymentHistory');
  const back = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'));

  if (!f.isAuthenticated) {
    return (
      <AuthGatePage
        title={title}
        onBack={back}
        icon="log-in-outline"
        emptyTitle={t('membership.loginRequiredTitle')}
        subtitle={t('payment.myPaymentsLoginSubtitle')}
      />
    );
  }

  return (
    <PageShell
      title={title}
      onBack={back}
      mode="list"
      loading={f.isLoading}
      loadingFallback={<RowListSkeleton rows={5} />}
    >
      <FlatList
        data={f.payments}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PaymentHistoryItem item={item} onPress={f.handlePaymentPress} />}
        contentContainerStyle={pageListContentStyle}
        refreshing={f.isRefreshing}
        onRefresh={() => f.fetchPayments()}
        ListEmptyComponent={
          <EmptyState
            icon="receipt-outline"
            title={t('payment.noHistory')}
            subtitle={t('payment.noPaymentsSubtitle')}
          />
        }
      />
    </PageShell>
  );
}
