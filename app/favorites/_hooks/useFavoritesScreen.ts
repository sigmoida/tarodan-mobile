import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { toast } from '@/ui';
import { useFavorites, type WishlistItem } from '@/hooks/useFavorites';
import { useAuthStore } from '@/stores/authStore';
import { useCartStore } from '@/stores/cartStore';
import { useCartSync } from '@/hooks/useCartSync';
import { getImageUrl as getImageUrlFromUtils } from '@/utils/imageUrl';
import { formatPrice } from '@/utils/format';

/**
 * Favorites-screen controller — wraps the useFavorites + cartStore hooks with
 * the screen's focus fetch, remove and cart-toggle. Feedback is an actionless
 * `toast.success` / `toast.error` (web parity) — the old Snackbar offered the
 * cart action on EVERY message, errors included.
 */
export function useFavoritesScreen() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuthStore();
  const { items, isLoading, error, fetchFavorites, removeFromFavorites, getFavoriteCount } = useFavorites();
  const { isInCart } = useCartStore();
  // Sepet yazmaları üyede sunucuya da aynalanır.
  const cart = useCartSync();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) {
        fetchFavorites();
      }
    }, [isAuthenticated]),
  );

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

  // Toggle: sepetteyse çıkar, değilse ekle (tekrar basınca adet artırmasın).
  const handleToggleCart = (item: WishlistItem) => {
    if (isInCart(item.productId)) {
      cart.removeByProductId(item.productId);
      toast.success(t('cart.removedFromCart'));
      return;
    }
    const product = item.product;
    cart.add({
      productId: product.id,
      title: product.title,
      price: product.price,
      imageUrl: getImageUrlFromUtils(product.images),
      seller: product.seller,
    });
    toast.success(t('cart.addedToCart'));
  };

  return {
    isAuthenticated,
    items,
    isLoading,
    error,
    fetchFavorites,
    getFavoriteCount,
    isInCart,
    refreshing,
    onRefresh,
    handleRemove,
    handleToggleCart,
    formatPrice,
  };
}

export type FavoritesScreenController = ReturnType<typeof useFavoritesScreen>;
