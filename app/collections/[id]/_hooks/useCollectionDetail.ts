import { logger, safeError } from '@/services/logger';
import { useState, useEffect } from 'react';
import { Share } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { collectionsApi } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api/errorText';
import { qk } from '@/lib/query';
import { useRefresh } from '@/hooks/useRefresh';
import { useAuthStore } from '@/stores/authStore';
import { buildShareContent, collectionShareUrl } from '@/utils/share';
import { copyToClipboard } from '@/lib/clipboard';
import { toast } from '@/ui';
import type { CollectionItemSummary } from '@/types';
import type { CollectionDetail } from '../../_lib/types';
import { useCollectionQuery } from '../../_hooks/useCollectionQuery';
import { useRemoveCollectionItem } from '../../_hooks/useRemoveCollectionItem';

/** `like` / `unlike` answer, with or without the `{ data }` envelope. */
interface LikeBody {
  liked?: boolean;
  likeCount?: number;
}
type LikeResponse = { data?: LikeBody & { data?: LikeBody } } | undefined;

/**
 * Collection detail controller — owns the collection query, optimistic like,
 * share, the owner's item removal and derived owner/premium flags.
 */
export function useCollectionDetail() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  // Premium/business üyeler zaten koleksiyon oluşturabildiği için upsell'i gizle.
  const isPremiumMember =
    user?.membershipTier === 'premium' || user?.membershipTier === 'business';
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  const { data: apiCollection, isLoading, isLoadingError, refetch } = useCollectionQuery(id);

  // NOT: viewCount artık backend'de kullanıcı başına tekilleştiriliyor; aynı kullanıcı
  // refresh'lese/tekrar açsa görüntülenme artmaz. Refetch güvenli.
  const { refreshing, onRefresh } = useRefresh(refetch);

  const collection = apiCollection;
  const items: CollectionItemSummary[] = collection?.items ?? [];
  // Koleksiyon sahibi: ürün ekleme/düzenleme kontrollerini sadece sahibe göster.
  const isOwner = isAuthenticated && !!user?.id && user.id === collection?.userId;

  const { requestRemove, removingId } = useRemoveCollectionItem(String(id));

  // Beğeni durumu/sayısını server'dan senkronize et (web ile parite)
  useEffect(() => {
    if (apiCollection) {
      setIsLiked(!!apiCollection.isLiked);
      setLikeCount(apiCollection.likeCount ?? 0);
    }
  }, [apiCollection]);

  // Web `handleShare` ile aynı: paylaşım sayfası açılamazsa (hata/yok) linki panoya kopyala +
  // "Link kopyalandı"; o da olmazsa hata toast'ı. Sessizce yutulmaz. Kullanıcının paylaşımı
  // kapatması hata değildir (RN `Share.share` reddetmez, `dismissedAction` ile çözülür).
  const handleShare = async () => {
    if (!collection) return;
    const url = collectionShareUrl(String(collection.id ?? id));
    try {
      const { content, options } = buildShareContent(
        t('collection.shareText', { name: collection.name, description: collection.description ?? '' }),
        url,
        collection.name,
      );
      await Share.share(content, options);
      return;
    } catch (error) {
      logger.warn('Share unavailable, copying link', { err: safeError(error) });
    }
    if (copyToClipboard(url)) toast.success(t('collection.linkCopied'));
    else toast.error(t('common.copyFailed'));
  };

  const handleLike = async () => {
    if (!isAuthenticated) {
      router.push('/(auth)/login');
      return;
    }
    const next = !isLiked;
    // Optimistic
    setIsLiked(next);
    setLikeCount((c) => Math.max(0, c + (next ? 1 : -1)));
    try {
      // Server'ın döndürdüğü gerçeği (liked/likeCount) optimistic state'in üstüne yaz.
      const resp: LikeResponse = next
        ? await collectionsApi.like(String(id))
        : await collectionsApi.unlike(String(id));
      const data = resp?.data?.data ?? resp?.data;
      const serverLiked = typeof data?.liked === 'boolean' ? data.liked : next;
      const serverCount = typeof data?.likeCount === 'number' ? data.likeCount : undefined;
      if (serverCount !== undefined) {
        setIsLiked(serverLiked);
        setLikeCount(serverCount);
      }
      queryClient.invalidateQueries({ queryKey: qk.collections.all });
      queryClient.invalidateQueries({ queryKey: qk.collections.liked });
      queryClient.invalidateQueries({ queryKey: qk.collections.mine });
      // ['collection', id] cache'ini taze tut ki tekrar girince stale (eski isLiked/likeCount)
      // gelmesin. Cache'i elle güncelliyoruz (viewCount backend'de tekilleştirildiği için
      // refetch de güvenli olurdu; yine de gereksiz istekten kaçınıyoruz).
      queryClient.setQueryData(qk.collections.detail(String(id)), (old: CollectionDetail | null | undefined) =>
        old ? { ...old, isLiked: serverLiked, likeCount: serverCount ?? old.likeCount } : old,
      );
    } catch (error) {
      // Rollback, and say so: the heart must not silently flip back.
      setIsLiked(!next);
      setLikeCount((c) => Math.max(0, c + (next ? -1 : 1)));
      toast.error(apiErrorMessage(error, t('common.operationFailed')));
    }
  };

  return {
    id,
    isLoading,
    // The first read failed (not a 404): the screen shows an error with a retry, not "not found".
    loadFailed: isLoadingError,
    retry: () => void refetch(),
    collection,
    items,
    isOwner,
    isPremiumMember,
    isAuthenticated,
    isLiked,
    likeCount,
    handleShare,
    handleLike,
    requestRemove,
    removingId,
    refreshing,
    onRefresh,
  };
}

export type CollectionDetailController = ReturnType<typeof useCollectionDetail>;
