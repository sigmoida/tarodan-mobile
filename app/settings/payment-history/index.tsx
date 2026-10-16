import { useCallback } from 'react';
import Animated from 'react-native-reanimated';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { EmptyState, pageListContentStyle, usePageScrollHandler } from '@/ui';
import { AuthGatePage } from '@/components/common/AuthGatePage';
import { listWindowing } from '@/lib/list/windowing';
import { PageShell } from '@/components/common/PageShell';
import { RowListSkeleton } from '@/components/common/RowListSkeleton';
import { usePaymentHistory } from './_hooks/usePaymentHistory';
import { PaymentHistoryItem } from './_components/PaymentHistoryItem';
import type { Payment } from './_lib/types';

const paymentKey = (item: Payment) => item.id;

/** Ödeme geçmişi — PageShell (Skeleton) + web Card satırları; boşken EmptyState. */
export default function PaymentHistoryScreen() {
  const { t } = useTranslation();
  const f = usePaymentHistory();
  const page = usePageScrollHandler();
  const title = t('mobile.settingsPaymentHistory');
  const renderPayment = useCallback(
    ({ item }: { item: Payment }) => <PaymentHistoryItem item={item} onPress={f.handlePaymentPress} />,
    [f.handlePaymentPress],
  );
  const back = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'));

  if (!f.isAuthenticated) {
    return (
      <AuthGatePage
        title={title}
        onBack={back}
        icon="arrow-right-on-rectangle"
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
      scroll={page}
      loading={f.isLoading}
      loadingFallback={<RowListSkeleton rows={5} />}
    >
      <Animated.FlatList
        {...page.listProps}
        data={f.payments}
        keyExtractor={paymentKey}
        renderItem={renderPayment}
        {...listWindowing}
        contentContainerStyle={page.contentStyle(pageListContentStyle)}
        refreshing={f.isRefreshing}
        onRefresh={() => f.fetchPayments()}
        ListEmptyComponent={
          <EmptyState
            icon="receipt-percent"
            title={t('payment.noHistory')}
            subtitle={t('payment.noPaymentsSubtitle')}
          />
        }
      />
    </PageShell>
  );
}
