import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { EmptyState, ErrorState, SkeletonCard, toast } from '@/ui';
import { router } from 'expo-router';

import RatingModal from '@/components/RatingModal';
import { PageShell } from '@/components/common/PageShell';
import { styles } from './_lib/ordersStyles';
import type { Order } from './_lib/ordersStatus';
import { useOrders } from './_hooks/useOrders';
import { OrderCard } from './_components/OrderCard';
import { OrdersFilters, OrderGroupCard, useOrdersEmptyTitle } from './_components/OrdersSections';

/**
 * Siparişlerim (alıcı) — İNCE ekran. `useOrders` kontrolcüsü gruplu/düz sorguyu, filtreyi, accordion
 * ve değerlendirme modalı durumunu taşır; burası PageShell + filtre chip'leri + liste + modalı
 * kompoze eder. Yükleme Skeleton, boş/hata durumu filtre chip'lerini gizlemez.
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
          actionLabel: t('common.login'),
          onAction: () => router.push('/(auth)/login'),
        }}
      />
    );
  }

  const onRate = (type: 'product' | 'seller', order: Order) =>
    f.setRatingModal({ visible: true, type, order });

  return (
    <PageShell
      title={t('order.myOrders')}
      onBack={back}
      refreshing={f.refreshing}
      onRefresh={f.onRefresh}
      overlay={
        <RatingModal
          visible={f.ratingModal.visible}
          onDismiss={() => f.setRatingModal({ ...f.ratingModal, visible: false })}
          type={f.ratingModal.type}
          orderId={f.ratingModal.order?.id || ''}
          productId={f.ratingModal.order?.product.id}
          sellerId={f.ratingModal.order?.seller.id}
          productTitle={f.ratingModal.order?.product.title}
          sellerName={f.ratingModal.order?.seller.displayName}
          onSuccess={() => {
            f.refetch();
            toast.success(t('order.reviewReceived'));
          }}
        />
      }
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
          description={t('order.startShopping')}
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
