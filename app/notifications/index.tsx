import { useCallback } from 'react';
import Animated from 'react-native-reanimated';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { EmptyState, ErrorState, Spinner, TopBarAction, usePageScrollHandler } from '@/ui';
import { PageShell } from '@/components/common/PageShell';
import { RowListSkeleton } from '@/components/common/RowListSkeleton';
import { useNotifications } from './_hooks/useNotifications';
import { styles } from './_lib/styles';
import { NotificationRow } from './_components/NotificationRow';
import type { Notification } from './_lib/types';

/**
 * Bildirimler — yığın ekranı (sekme köklerinin üst barındaki Bildirimler düğmesinden, push
 * bildiriminden ve `/notifications` derin bağlantısından açılır): PageShell (geri oklu yüzen bar) +
 * liste; Skeleton, çekip yenileme, sonsuz kaydırma; sağ üstte "tümünü okundu işaretle" cam ikonu
 * (okunmamış sayısı rozetinde, danger-500).
 */
export default function NotificationsScreen() {
  const { t } = useTranslation();
  const f = useNotifications();
  const page = usePageScrollHandler();
  const title = t('notification.notifications');

  const renderItem = useCallback(
    ({ item }: { item: Notification }) => <NotificationRow item={item} onPress={f.handlePress} />,
    [f.handlePress],
  );

  if (!f.isAuthenticated) {
    return (
      <PageShell
        title={title}
        empty
        emptyState={{
          icon: 'bell',
          title: t('notification.loginToView'),
          subtitle: t('notification.loginPromptDesc'),
          actionLabel: t('common.login'),
          onAction: () => router.push('/(auth)/login'),
        }}
      />
    );
  }

  return (
    <PageShell
      title={title}
      mode="list"
      // Yükleniyor iskeleti listeyi taşımaz: bar altından başlasın (sabit şerit).
      scroll={f.loading ? undefined : page}
      // Sağ eylem tek cam ikon (okunmamış sayısı rozetinde): metin hapı + ayrı rozet Android'de
      // ortalanmış başlığı ezip "Bildiriml…" diye kesiyordu (yan yuvalar eşit genişlikte).
      right={
        f.unreadCount > 0 && f.handleMarkAllAsRead ? (
          <TopBarAction
            icon="envelope-open"
            accessibilityLabel={t('notification.markAllRead')}
            count={f.unreadCount}
            onPress={f.handleMarkAllAsRead}
            testID="notifications-mark-all-read"
          />
        ) : undefined
      }
    >
      {f.loading ? (
        <RowListSkeleton rows={6} />
      ) : (
        <Animated.FlatList
          {...page.listProps}
          testID="notifications-list"
          data={f.notifications}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          // #82: virtualizasyon ayarı — çok sayıda bildirimde bellek/kaydırma.
          windowSize={7}
          initialNumToRender={8}
          maxToRenderPerBatch={10}
          removeClippedSubviews
          contentContainerStyle={page.contentStyle(styles.listContent)}
          refreshing={f.refreshing}
          onRefresh={f.handleRefresh}
          ListEmptyComponent={
            f.loadFailed ? (
              <ErrorState onRetry={f.retry} />
            ) : (
              <EmptyState
                icon="bell"
                title={t('notification.noneYet')}
                subtitle={t('notification.emptyListDesc')}
              />
            )
          }
          onEndReached={f.loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={f.loadingMore ? <Spinner style={styles.footerSpinner} /> : null}
        />
      )}
    </PageShell>
  );
}
