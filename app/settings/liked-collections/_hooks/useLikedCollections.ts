import { logger, safeError } from '@/services/logger';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/query';
import { useTranslation } from 'react-i18next';
import { toast } from '@/ui';
import { collectionsApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useRefetchStaleOnFocus } from '@/hooks/useRefetchStaleOnFocus';
import { IMAGE_PLACEHOLDER } from '@/utils/imageUrl';
import type { LikedCollection } from '../_lib/types';

/**
 * Liked-collections controller — owns the list query, unlike action, refresh
 * and stale-only focus refetch. Lifted verbatim from the monolithic screen (app/CLAUDE.md › Worked examples).
 */
export function useLikedCollections() {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: qk.collections.liked,
    queryFn: async () => {
      try {
        const response = await collectionsApi.getLikedCollections();
        const result = response.data?.collections || response.data?.data || response.data || [];
        // Yalnız sayı: yanıt gövdesi (başlık, kullanıcı alanları) ne basılır ne de
        // release'te boşuna stringify edilir (`logger.debug` argümanı her zaman hesaplanır).
        logger.debug('Liked collections response', {
          count: Array.isArray(result) ? result.length : 0,
        });
        return result;
      } catch (err) {
        logger.error('Failed to fetch liked collections', { err: safeError(err) });
        return [];
      }
    },
    enabled: isAuthenticated,
  });

  const collections: LikedCollection[] = Array.isArray(data) ? data : [];

  // Ekrana dönüşte yalnız bayatsa tazele (beğeni/geri alma zaten invalidate ediyor).
  useRefetchStaleOnFocus([qk.collections.liked], isAuthenticated);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleUnlike = async (collectionId: string) => {
    try {
      await collectionsApi.unlike(collectionId);
      queryClient.invalidateQueries({ queryKey: qk.collections.liked });
      toast.success(t('collection.removedFromLikes'));
    } catch (err) {
      logger.error('Failed to unlike collection', { err: safeError(err) });
      toast.error(t('utility.error500.title'));
    }
  };

  const getImageUrl = (collection: LikedCollection) => {
    if (collection.coverImageUrl) return collection.coverImageUrl;
    return IMAGE_PLACEHOLDER;
  };

  return {
    isAuthenticated,
    collections,
    isLoading,
    error,
    refetch,
    refreshing,
    onRefresh,
    handleUnlike,
    getImageUrl,
  };
}

export type LikedCollectionsController = ReturnType<typeof useLikedCollections>;
