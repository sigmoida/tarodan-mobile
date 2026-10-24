import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import {
  EmptyState,
  ErrorState,
  SkeletonCard,
  Spinner,
  pageListContentStyle,
  usePageScrollHandler,
  useReadableContentStyle,
} from '@/ui';
import { router } from 'expo-router';

import { PageShell } from '@/components/common/PageShell';
import { listWindowing } from '@/lib/list/windowing';
import { styles } from './_lib/ordersStyles';
import type { Order, OrderListEntry } from './_lib/ordersStatus';
import { useOrders } from './_hooks/useOrders';
import { openOrderReview } from './[id]/_lib/routes';
import { OrderCard } from './_components/OrderCard';
import { OrdersFilters, OrderGroupCard, useOrdersEmptyTitle } from './_components/OrdersSections';

const entryKey = (entry: OrderListEntry) =>
  entry.kind === 'order' ? entry.order.id : `group:${entry.group.id}`;

// Modül düzeyinde: satır başına closure yok → memo'lu kartlar yeniden çizilmez.
const onRate = (type: 'product' | 'seller', order: Order) => openOrderReview(order.id, type);

/**
 * Siparişlerim (alıcı) — İNCE ekran. `useOrders` kontrolcüsü gruplu/düz sorguyu (sayfalı),
 * filtreyi ve accordion durumunu taşır; burası PageShell (list modu) + filtre chip'leri (liste
 * başlığı) + sanallaştırılmış liste kompoze eder. "Değerlendir" ayrı form ekranını iter
 * (`/orders/[id]/review`). Yükleme Skeleton, boş/hata durumu filtre chip'lerini gizlemez.
 */
export default function OrdersScreen() {
  const { t } = useTranslation();
  const f = useOrders();
  const page = usePageScrollHandler();
  // Readable width on large screens (src/ui/CLAUDE.md › Large screens).
  const listContentStyle = useReadableContentStyle([pageListContentStyle, styles.list]);
  const emptyTitle = useOrdersEmptyTitle(f.filter);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'));

  const { expandedGroups, toggleGroup } = f;
  // Kararlı renderItem (erken return'den ÖNCE — hook sırası sabit).
  const renderEntry = useCallback(
    ({ item }: { item: OrderListEntry }) =>
      item.kind === 'order' ? (
        <OrderCard order={item.order} onRate={onRate} />
      ) : (
        <OrderGroupCard
          group={item.group}
          isExpanded={expandedGroups.has(item.group.id)}
          onToggle={toggleGroup}
          onRate={onRate}
        />
      ),
    [expandedGroups, toggleGroup],
  );

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

  const loading = f.isLoading && f.entries.length === 0;
  const failed = !!f.ordersError && f.entries.length === 0;

  return (
    <PageShell title={t('order.myOrders')} onBack={back} mode="list" scroll={page}>
      <Animated.FlatList
        {...page.listProps}
        testID="orders-list"
        data={loading || failed ? [] : f.entries}
        keyExtractor={entryKey}
        renderItem={renderEntry}
        {...listWindowing}
        contentContainerStyle={page.contentStyle(listContentStyle)}
        refreshing={f.refreshing}
        onRefresh={f.onRefresh}
        onEndReached={f.loadMore}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={<OrdersFilters f={f} />}
        ListFooterComponent={f.isFetchingNextPage ? <Spinner style={styles.footerSpinner} /> : null}
        ListEmptyComponent={
          failed ? (
            <ErrorState placement="list" message={t('order.loadFailedRetry')} onRetry={() => f.refetch()} />
          ) : loading ? (
            <View style={styles.list}>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </View>
          ) : (
            <EmptyState
              placement="list"
              icon="receipt-percent"
              title={emptyTitle}
              subtitle={t('order.startShopping')}
              actionLabel={t('order.exploreProducts')}
              onAction={() => router.push('/search')}
            />
          )
        }
      />
    </PageShell>
  );
}
