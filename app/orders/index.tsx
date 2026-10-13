import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { EmptyState, ErrorState, SkeletonCard } from '@/ui';
import { router } from 'expo-router';

import { PageShell } from '@/components/common/PageShell';
import { styles } from './_lib/ordersStyles';
import type { Order } from './_lib/ordersStatus';
import { useOrders } from './_hooks/useOrders';
import { openOrderReview } from './[id]/_lib/routes';
import { OrderCard } from './_components/OrderCard';
import { OrdersFilters, OrderGroupCard, useOrdersEmptyTitle } from './_components/OrdersSections';

/**
 * Siparişlerim (alıcı) — İNCE ekran. `useOrders` kontrolcüsü gruplu/düz sorguyu, filtreyi ve
 * accordion durumunu taşır; burası PageShell + filtre chip'leri + listeyi kompoze eder.
 * "Değerlendir" ayrı form ekranını iter (`/orders/[id]/review`). Yükleme Skeleton, boş/hata
 * durumu filtre chip'lerini gizlemez.
 */
export default function OrdersScreen() {
  const { t } = useTranslation();
  const f = useOrders();
  const emptyTitle = useOrdersEmptyTitle(f.filter);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'));

  if (!f.isAuthenticated) {
    return (
      <PageShell
        title={t('order.myOrders')}
        onBack={back}
        empty
        emptyState={{
          icon: 'receipt-percent',
          title: t('order.signInToView'),
          subtitle: t('emptyState.loginRequiredHint'),
          actionLabel: t('common.login'),
          onAction: () => router.push('/(auth)/login'),
        }}
      />
    );
  }

  const onRate = (type: 'product' | 'seller', order: Order) => openOrderReview(order.id, type);

  return (
    <PageShell
      title={t('order.myOrders')}
      onBack={back}
      refreshing={f.refreshing}
      onRefresh={f.onRefresh}
    >
      <OrdersFilters f={f} />

      {f.ordersError ? (
        <ErrorState message={t('order.loadFailedRetry')} onRetry={() => f.refetch()} />
      ) : f.isLoading && f.entries.length === 0 ? (
        <View style={styles.list}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : f.entries.length === 0 ? (
        <EmptyState
          icon="receipt-percent"
          title={emptyTitle}
          subtitle={t('order.startShopping')}
          actionLabel={t('order.exploreProducts')}
          onAction={() => router.push('/search')}
        />
      ) : (
        <View style={styles.list}>
          {f.entries.map((entry) =>
            entry.kind === 'order' ? (
              <OrderCard key={entry.order.id} order={entry.order} onRate={onRate} />
            ) : (
              <OrderGroupCard
                key={entry.group.id}
                group={entry.group}
                isExpanded={f.expandedGroups.has(entry.group.id)}
                onToggle={() => f.toggleGroup(entry.group.id)}
                onRate={onRate}
              />
            )
          )}
        </View>
      )}
    </PageShell>
  );
}
