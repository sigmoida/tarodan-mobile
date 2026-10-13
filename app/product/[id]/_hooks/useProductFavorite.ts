import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/ui';
import { qk } from '@/lib/query';
import { useFavorites } from '@/hooks/useFavorites';
import { invalidateProductLists } from '../_lib/invalidate';
import type { Product } from '../_lib/types';

/**
 * Favori (beğeni) durumu + toggle. Beğeni sayısı server likeCount'undan
 * senkronlanır ve optimistic güncellenir.
 *
 * Favoriler `useFavorites` (React Query) üzerinden gelir — davranış korunur;
 * bu hook'un dışına (çağıran ekrana) hiçbir değişiklik sızmaz.
 */
export function useProductFavorite({
  product,
  productId,
  isAuthenticated,
}: {
  product: Product | null | undefined;
  productId: string;
  isAuthenticated: boolean;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { addToFavorites, removeFromFavorites, isInFavorites, fetchFavorites } =
    useFavorites();

  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  // Giriş yapılıysa favoride mi kontrol et.
  useEffect(() => {
    if (isAuthenticated && productId) {
      fetchFavorites().then(() => setIsFavorite(isInFavorites(productId)));
    }
  }, [isAuthenticated, productId]);

  // Beğeni sayısını server likeCount'undan senkronla.
  useEffect(() => {
    if (product) setFavoriteCount(product.likeCount ?? 0);
  }, [product]);

  const toggle = async () => {
    if (!isAuthenticated) {
      toast.error(t('product.signInToFavorite'));
      setTimeout(() => router.push('/(auth)/login'), 1500);
      return;
    }
    setFavoriteLoading(true);
    try {
      if (isFavorite) {
        const success = await removeFromFavorites(productId);
        if (success) {
          setIsFavorite(false);
          setFavoriteCount((c) => Math.max(0, c - 1));
          invalidateProductLists(queryClient);
          queryClient.invalidateQueries({ queryKey: qk.products.detail(productId) });
          toast.success(t('product.favoriteRemoved'));
        } else {
          toast.error(t('product.favoriteRemoveFailed'));
        }
      } else {
        const success = await addToFavorites(productId);
        if (success) {
          setIsFavorite(true);
          setFavoriteCount((c) => c + 1);
          invalidateProductLists(queryClient);
          queryClient.invalidateQueries({ queryKey: qk.products.detail(productId) });
          toast.success(t('product.favoriteAdded'));
        } else {
          toast.error(t('product.favoriteAddFailed'));
        }
      }
    } catch {
      toast.error(t('utility.error500.title'));
    } finally {
      setFavoriteLoading(false);
    }
  };

  return { isFavorite, favoriteCount, favoriteLoading, toggle };
}
