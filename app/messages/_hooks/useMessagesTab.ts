import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useMessagesStore, type MessageThread } from '@/stores/messagesStore';
import { useAuthStore } from '@/stores/authStore';
import { useThreadsQuery, useDailyMessageLimit } from '@/hooks/messaging';
import { useRefetchStaleOnFocus } from '@/hooks/useRefetchStaleOnFocus';
import { qk } from '@/lib/query';

/**
 * Messages-tab controller — threads artık React Query (#77); focus'ta
 * yalnız bayatsa tazeleme, güvenli participant resolver ve limit türevleri burada.
 * getOtherParticipant client store'dan; günlük hak sunucudan (useDailyMessageLimit).
 */
export function useMessagesTab() {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuthStore();
  const getOtherParticipant = useMessagesStore((s) => s.getOtherParticipant);
  const { data: threads = [], isLoading, isFetched: hasLoadedThreads, refetch } = useThreadsQuery();
  const daily = useDailyMessageLimit();
  const [refreshing, setRefreshing] = useState(false);

  // Dönüşte yalnız bayatsa tazele: yeni mesajları socket köprüsü zaten invalidate ediyor,
  // her odakta iki istek (ilk açılışta ikişer) gereksizdi.
  useRefetchStaleOnFocus([qk.messaging.threads, qk.messaging.dailyLimit], isAuthenticated);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Güvenli participant helper — store'dan gelen null/undefined durumlarını yakala.
  const safeGetOther = useCallback((thread: MessageThread) => {
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
  }, [getOtherParticipant, t]);

  // Kararlı denetleyici: FlatList satırları (memo) yalnız gerçek değişimde yeniden çizilir.
  return useMemo(
    () => ({
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
    }),
    [isAuthenticated, user, threads, isLoading, hasLoadedThreads, daily.used, daily.limit, daily.nearLimit, refreshing, onRefresh, safeGetOther],
  );
}

export type MessagesTabController = ReturnType<typeof useMessagesTab>;
