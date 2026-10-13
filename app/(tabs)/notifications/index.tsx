import { useCallback } from 'react';
import { View, FlatList } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Badge, EmptyState, Spinner, TopBarAction, pageListContentStyle } from '@/ui';
import { PageShell } from '@/components/common/PageShell';
import { RowListSkeleton } from '@/components/common/RowListSkeleton';
import { useTabBarInset } from '@/components/shell/tabBarLayout';
import { useNotifications } from './_hooks/useNotifications';
import { styles } from './_lib/styles';
import { NotificationRow } from './_components/NotificationRow';
import type { Notification } from './_lib/types';

/**
 * Bildirimler — AppShell'in zil ikonundan açılan liste. PageShell (beyaz üst bar, Skeleton,
 * çekip yenileme, sonsuz kaydırma); sağ üstte okunmamış sayacı (danger-500) ve "Tümünü oku".
 */
export default function NotificationsScreen() {
  const { t } = useTranslation();
  const f = useNotifications();
  const tabInset = useTabBarInset();
  const title = t('notification.notifications');

  const renderItem = useCallback(
    ({ item }: { item: Notification }) => <NotificationRow item={item} onPress={f.handlePress} />,
    [f.handlePress],
  );

  if (!f.isAuthenticated) {
    return (
      <PageShell
        title={title}
        onBack={f.handleBack}
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
      onBack={f.handleBack}
      mode="list"
      right={
        f.unreadCount > 0 ? (
          <View style={styles.headerRight}>
            <Badge variant="danger" appearance="solid" size="sm">
              {f.unreadCount}
            </Badge>
            {f.handleMarkAllAsRead ? (
              <TopBarAction label={t('notification.markAllReadShort')} onPress={f.handleMarkAllAsRead} />
            ) : null}
          </View>
        ) : undefined
      }
      loading={f.loading}
      loadingFallback={<RowListSkeleton rows={6} />}
    >
      <FlatList
        testID="notifications-list"
        data={f.notifications}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        // #82: virtualizasyon ayarı — çok sayıda bildirimde bellek/kaydırma.
        windowSize={7}
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        removeClippedSubviews
        contentContainerStyle={[
          f.notifications.length === 0 ? styles.emptyList : pageListContentStyle,
          { paddingBottom: tabInset },
        ]}
        refreshing={f.refreshing}
        onRefresh={f.handleRefresh}
        ListEmptyComponent={
          <EmptyState
            icon="bell"
            title={t('notification.noneYet')}
            subtitle={t('notification.emptyListDesc')}
          />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        onEndReached={f.loadMore}
        onEndReachedThreshold={0.4}
        ListFooterComponent={f.loadingMore ? <Spinner style={styles.footerSpinner} /> : null}
      />
    </PageShell>
  );
}
