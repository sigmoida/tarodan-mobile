import { useCallback, useMemo } from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { toast } from '@/ui';
import { useAuthStore } from '@/stores/authStore';
import { useFavorites } from './useFavorites';
import { useStableCallback } from './useStableCallback';

/** Misafir uyarısından sonra giriş ekranına geçmeden önceki bekleme (toast okunabilsin). */
const SIGN_IN_REDIRECT_MS = 1500;

/**
 * Ürün başına süren favori isteği — modül seviyesinde: aynı ürün kartta, başka bir rayda ve detayda
 * aynı anda dokunulsa da ikinci istek gitmez (çift dokunma ekle+çıkar yarışı yok).
 */
const inFlight = new Set<string>();

export type FavoriteToggleResult = 'added' | 'removed' | 'failed' | 'signin' | 'busy';

/**
 * Favori ekle/çıkar — ürün detayı ve ürün kartının TEK akışı (web `useToggleFavorite` karşılığı).
 * - Misafir: `product.signInToFavorite` uyarısı + giriş ekranı.
 * - Giriş yapmış: favorites cache'ine göre ekler ya da çıkarır (`useFavorites`: iyimser + rollback,
 *   409/404 toleransı), sonucu toast'la bildirir. Ürün listeleri invalidate EDİLMEZ (pahalı);
 *   kalp durumu reaktif `favoriteIds`'ten okunur, detay ve kart aynı cache'i görür.
 * `toggle` kimliği sabittir (memo'lu kartlara geçirilebilir).
 */
export function useFavoriteToggle() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuthStore();
  const { items, isInFavorites, addToFavorites, removeFromFavorites, fetchFavorites } = useFavorites();
  const favoriteIds = useMemo(() => new Set(items.map((i) => String(i.productId))), [items]);

  const toggle = useStableCallback(async (productId: string): Promise<FavoriteToggleResult> => {
    if (!isAuthenticated) {
      toast.error(t('product.signInToFavorite'));
      setTimeout(() => router.push('/(auth)/login'), SIGN_IN_REDIRECT_MS);
      return 'signin';
    }
    if (inFlight.has(productId)) return 'busy';
    inFlight.add(productId);
    const wasFavorite = isInFavorites(productId);
    try {
      const ok = wasFavorite ? await removeFromFavorites(productId) : await addToFavorites(productId);
      if (!ok) {
        toast.error(t(wasFavorite ? 'product.favoriteRemoveFailed' : 'product.favoriteAddFailed'));
        return 'failed';
      }
      toast.success(t(wasFavorite ? 'product.favoriteRemoved' : 'product.favoriteAdded'));
      return wasFavorite ? 'removed' : 'added';
    } catch {
      toast.error(t('utility.error500.title'));
      return 'failed';
    } finally {
      inFlight.delete(productId);
    }
  });

  // `fetchFavorites` her render'da yeni: effect bağımlılığı olabilsin diye kimliği sabitlenir.
  const refetch = useStableCallback(() => fetchFavorites());

  return { favoriteIds, isAuthenticated, toggle, refetch };
}

/** Kartın sahiplik için okuduğu alanlar (liste DTO'su `sellerId` ya da `seller.id` taşır). */
export interface FavoriteCardTarget {
  id: string;
  sellerId?: string | null;
  seller?: { id?: string | null } | null;
}

/** `ProductCard`'ın favori prop'ları; kalp yalnız `onToggleFavorite` verilince çizilir. */
export interface ProductCardFavoriteProps {
  isFavorite?: boolean;
  onToggleFavorite?: (productId: string) => void;
}

const NO_FAVORITE: ProductCardFavoriteProps = {};

/** Kullanıcının kendi ilanı mı (kartta kalp gösterilmez — kendi ürünü favorilenemez). */
export function isOwnProduct(product: FavoriteCardTarget, userId: string | null | undefined): boolean {
  const sellerId = product.sellerId ?? product.seller?.id;
  return !!userId && !!sellerId && String(sellerId) === String(userId);
}

/**
 * Ürün listesi başına BİR kez çağrılır (ProductGrid, ray, arama…): favori kimliklerini tek bir
 * `Set` olarak türetir ve her kart için `{ isFavorite, onToggleFavorite }` döndüren bir seçici verir.
 * Değerler ilkel/sabit kimlikli olduğu için `<ProductCard {...favoriteProps(p)} />` memo'yu bozmaz.
 * Kendi ilanında boş nesne döner (kalp yok). Misafire de kalp gösterilir; basınca giriş akışı.
 */
export function useProductCardFavorites() {
  const { user } = useAuthStore();
  const { favoriteIds, toggle } = useFavoriteToggle();
  const onToggleFavorite = useCallback(
    (productId: string) => {
      void toggle(productId);
    },
    [toggle],
  );
  const userId = user?.id ? String(user.id) : null;
  return useCallback(
    (product: FavoriteCardTarget): ProductCardFavoriteProps =>
      isOwnProduct(product, userId)
        ? NO_FAVORITE
        : { isFavorite: favoriteIds.has(String(product.id)), onToggleFavorite },
    [favoriteIds, onToggleFavorite, userId],
  );
}
