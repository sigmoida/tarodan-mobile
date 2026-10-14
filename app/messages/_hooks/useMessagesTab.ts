import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useMessagesStore, type MessageThread } from '@/stores/messagesStore';
import { useAuthStore } from '@/stores/authStore';
import { useThreadsQuery, useDailyMessageLimit } from '@/hooks/messaging';

/**
 * Messages-tab controller — threads artık React Query (#77); focus'ta
 * refetch, güvenli participant resolver ve limit türevleri burada.
 * getOtherParticipant client store'dan; günlük hak sunucudan (useDailyMessageLimit).
 */
export function useMessagesTab() {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuthStore();
  const getOtherParticipant = useMessagesStore((s) => s.getOtherParticipant);
  const { data: threads = [], isLoading, isFetched: hasLoadedThreads, refetch } = useThreadsQuery();
  const daily = useDailyMessageLimit();
  const [refreshing, setRefreshing] = useState(false);

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

  return {
    isAuthenticated,
    user,
    threads,
    isLoading,
    hasLoadedThreads,
    dailyMessageCount: daily.used,
    refreshing,
    onRefresh,
    safeGetOther,
    messageLimit: daily.limit,
    dailyNearLimit: daily.nearLimit,
  };
}

export type MessagesTabController = ReturnType<typeof useMessagesTab>;
