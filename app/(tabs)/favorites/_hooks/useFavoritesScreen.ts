import { useState } from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { toast } from '@/ui';
import { useFavorites, type WishlistItem } from '@/hooks/useFavorites';
import { useAuthStore } from '@/stores/authStore';
import { useCartStore } from '@/stores/cartStore';
import { useCartSync } from '@/hooks/useCartSync';
import { useRefetchStaleOnFocus } from '@/hooks/useRefetchStaleOnFocus';
import { qk } from '@/lib/query';
import { cartItemFromListing } from '@/lib/cart/cartItemFromListing';
import { formatPrice } from '@/utils/format';

/**
 * Favorites-screen controller — wraps the useFavorites + cartStore hooks with
 * the screen's focus fetch, remove and add-to-cart (in cart → go to cart). Feedback is an actionless
 * `toast.success` / `toast.error` (web parity) — the old Snackbar offered the
 * cart action on EVERY message, errors included.
 */
export function useFavoritesScreen() {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { items, isLoading, error, fetchFavorites, removeFromFavorites, getFavoriteCount } = useFavorites();
  // Sepet yazmaları üyede sunucuya da aynalanır.
  const cart = useCartSync();
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

  /**
   * The card's cart button, the product detail's rule: not in the cart -> add 1 (+ the "added to
   * cart" toast); already there -> "Go to cart" opens the cart tab. Pressing again neither raises
   * the quantity nor removes it (removing is on the cart screen). The line is built like every
   * listing card's (`cartItemFromListing`), so the stock cap (`availableQuantity`) applies.
   */
  const handleCartAction = (item: WishlistItem) => {
    if (useCartStore.getState().isInCart(item.productId)) {
      router.push('/cart');
      return;
    }
    cart.add(cartItemFromListing(item.product, t('product.seller')));
    toast.success(t('product.addedToCartExclaim'));
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
    handleCartAction,
    formatPrice,
  };
}

export type FavoritesScreenController = ReturnType<typeof useFavoritesScreen>;
