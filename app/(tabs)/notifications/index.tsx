import { useCallback } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Badge, EmptyState, Spinner, TopBarAction, usePageScrollValue } from '@/ui';
import { tabDiag } from '@/components/_tabDiag';
import { RowListSkeleton } from '@/components/common/RowListSkeleton';
import { AppShell } from '@/components/shell/AppShell';
import { useTabBarInset } from '@/components/shell/tabBarLayout';
import { useTabBarScrollHandler } from '@/components/shell/TabBarCollapse';
import { useNotifications } from './_hooks/useNotifications';
import { styles } from './_lib/styles';
import { NotificationRow } from './_components/NotificationRow';
import type { Notification } from './_lib/types';

/**
 * Bildirimler sekmesi — sekme kökü (alt menüde Mesajlar'dan sonra): AppShell (başlıklı beyaz bar,
 * geri oku yok) + liste; Skeleton, çekip yenileme, sonsuz kaydırma; sağ üstte okunmamış sayacı
 * (danger-500) ve "Tümünü oku". Kaydırma alt menüyü daraltır (`useTabBarScrollHandler`).
 */
function NotificationsTabScreen() {
  const { t } = useTranslation();
  const f = useNotifications();
  const tabInset = useTabBarInset();
  const page = usePageScrollValue();
  // Tek handler hem alt menüyü hem üst barın kaydırma kenarını besler.
  const tabScroll = useTabBarScrollHandler(undefined, page.scrollY);
  const title = t('notification.notifications');

  const renderItem = useCallback(
    ({ item }: { item: Notification }) => <NotificationRow item={item} onPress={f.handlePress} />,
    [f.handlePress],
  );

  if (!f.isAuthenticated) {
    return (
      <AppShell variant="title" title={title}>
        <EmptyState
          icon="bell"
          title={t('notification.loginToView')}
          subtitle={t('notification.loginPromptDesc')}
          actionLabel={t('common.login')}
          onAction={() => router.push('/(auth)/login')}
        />
      </AppShell>
    );
  }

  return (
    <AppShell
      variant="title"
      title={title}
      // Yükleniyor iskeleti listeyi taşımaz: bar altından başlasın (sabit şerit).
      scroll={f.loading ? undefined : page}
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
    >
      {f.loading ? (
        <RowListSkeleton rows={6} />
      ) : (
        <Animated.FlatList
          {...tabScroll}
          {...page.scrollProps}
          scrollEventThrottle={16}
          testID="notifications-list"
          data={f.notifications}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          // #82: virtualizasyon ayarı — çok sayıda bildirimde bellek/kaydırma.
          windowSize={7}
          initialNumToRender={8}
          maxToRenderPerBatch={10}
          removeClippedSubviews
          contentContainerStyle={page.contentStyle([
            styles.listContent,
            { paddingBottom: tabInset },
          ])}
          progressViewOffset={page.topInset}
          refreshing={f.refreshing}
          onRefresh={f.handleRefresh}
          ListEmptyComponent={
            <EmptyState
              icon="bell"
              title={t('notification.noneYet')}
              subtitle={t('notification.emptyListDesc')}
            />
          }
          onEndReached={f.loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={f.loadingMore ? <Spinner style={styles.footerSpinner} /> : null}
        />
      )}
    </AppShell>
  );
}

export default tabDiag('notifications', NotificationsTabScreen);
