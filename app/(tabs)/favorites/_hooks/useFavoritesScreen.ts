import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/ui';
import { useFavorites } from '@/hooks/useFavorites';
import { useAuthStore } from '@/stores/authStore';
import { useRefetchStaleOnFocus } from '@/hooks/useRefetchStaleOnFocus';
import { qk } from '@/lib/query';
import { formatPrice } from '@/utils/format';

/**
 * Favorites-screen controller: wraps useFavorites with the screen's focus fetch and remove. The
 * card's cart button is the shared listing-card toggle (`ProductCardCartButton`), not handled here.
 * Feedback is an actionless `toast.success` / `toast.error` (web parity).
 */
export function useFavoritesScreen() {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { items, isLoading, error, fetchFavorites, removeFromFavorites, getFavoriteCount } = useFavorites();
  const [refreshing, setRefreshing] = useState(false);

  // Sekmeye dönüşte yalnız bayatsa tazele: kalp ekle/çıkar zaten favori önbelleğini güncelleyip
  // invalidate ediyor; her odakta istek (ilk açılışta ikinci istek) gereksizdi.
  useRefetchStaleOnFocus([qk.favorites.all], isAuthenticated);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFavorites();
    setRefreshing(false);
  };

  const handleRemove = async (productId: string) => {
    const success = await removeFromFavorites(productId);
    if (success) toast.success(t('product.removedFromFavorites'));
    else toast.error(t('utility.error500.title'));
  };

  return {
    isAuthenticated,
    items,
    isLoading,
    error,
    fetchFavorites,
    getFavoriteCount,
    refreshing,
    onRefresh,
    handleRemove,
    formatPrice,
  };
}

export type FavoritesScreenController = ReturnType<typeof useFavoritesScreen>;
