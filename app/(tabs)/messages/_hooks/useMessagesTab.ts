import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useMessagesStore, type MessageThread } from '@/stores/messagesStore';
import { useAuthStore } from '@/stores/authStore';
import { useThreadsQuery, useUnreadCountQuery, useDailyMessageLimit } from '@/hooks/messaging';

/**
 * Messages-tab controller — threads/unread artık React Query (#77); focus'ta
 * refetch, search filter, güvenli participant resolver ve limit türevleri burada.
 * getOtherParticipant client store'dan; günlük hak sunucudan (useDailyMessageLimit).
 */
export function useMessagesTab() {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuthStore();
  const getOtherParticipant = useMessagesStore((s) => s.getOtherParticipant);
  const { data: threads = [], isLoading, isFetched: hasLoadedThreads, refetch } = useThreadsQuery();
  const { data: unreadCount = 0 } = useUnreadCountQuery();
  const daily = useDailyMessageLimit();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) {
        refetch();
        daily.refetch();
      }
    }, [isAuthenticated, refetch, daily.refetch]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Güvenli participant helper — store'dan gelen null/undefined durumlarını yakala.
  const safeGetOther = (thread: MessageThread) => {
    try {
      const result = getOtherParticipant(thread);
      if (!result) {
        return { id: '', displayName: t('common.user'), avatarUrl: null };
      }
      return {
        id: result.id || '',
        displayName: result.displayName || t('common.user'),
        avatarUrl: result.avatarUrl || null,
      };
    } catch {
      return { id: '', displayName: t('common.user'), avatarUrl: null };
    }
  };

  const filteredThreads = threads.filter((thread) => {
    if (!searchQuery) return true;
    const other = safeGetOther(thread);
    return (
      other.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (thread.product?.title || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return {
    isAuthenticated,
    user,
    threads,
    isLoading,
    hasLoadedThreads,
    dailyMessageCount: daily.used,
    refreshing,
    onRefresh,
    searchQuery,
    setSearchQuery,
    safeGetOther,
    filteredThreads,
    unreadCount,
    messageLimit: daily.limit,
    dailyNearLimit: daily.nearLimit,
  };
}

export type MessagesTabController = ReturnType<typeof useMessagesTab>;
