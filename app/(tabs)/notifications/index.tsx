import { useCallback } from 'react';
import { View, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { EmptyState, ScreenLoader, Spinner, theme } from '@/ui';
import { useNotifications } from './_hooks/useNotifications';
import { styles } from './_lib/styles';
import { NotificationsHeader } from './_components/NotificationsHeader';
import { NotificationRow } from './_components/NotificationRow';
import type { Notification } from './_lib/types';

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const f = useNotifications();

  const renderItem = useCallback(
    ({ item }: { item: Notification }) => <NotificationRow item={item} onPress={f.handlePress} />,
    [f.handlePress],
  );

  if (!f.isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <NotificationsHeader onBack={f.handleBack} />
        <View style={styles.body}>
          <EmptyState
            fullscreen
            icon="notifications-outline"
            title={t('notification.loginToView')}
            subtitle={t('notification.loginPromptDesc')}
            actionLabel={t('common.login')}
            onAction={() => router.push('/(auth)/login')}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (f.loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <NotificationsHeader onBack={f.handleBack} />
        <View style={styles.body}>
          <ScreenLoader />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <NotificationsHeader
        onBack={f.handleBack}
        unreadCount={f.unreadCount}
        onMarkAll={f.handleMarkAllAsRead}
      />
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
        style={styles.body}
        contentContainerStyle={f.notifications.length === 0 ? styles.emptyList : styles.list}
        refreshControl={
          <RefreshControl
            refreshing={f.refreshing}
            onRefresh={f.handleRefresh}
            colors={[theme.colors.primary[500]]}
            tintColor={theme.colors.primary[500]}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="notifications-outline"
            title={t('notification.noneYet')}
            subtitle={t('notification.emptyListDesc')}
          />
        }
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        onEndReached={f.loadMore}
        onEndReachedThreshold={0.4}
        ListFooterComponent={f.loadingMore ? <Spinner style={styles.footerSpinner} /> : null}
      />
    </SafeAreaView>
  );
}
