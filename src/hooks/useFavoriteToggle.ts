import { useCallback, useContext, useMemo } from 'react';
import { router } from 'expo-router';
import { NavigationContext } from '@react-navigation/native';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from '@/ui';
import { qk } from '@/lib/query';
import { useAuthStore } from '@/stores/authStore';
import { useFavorites } from './useFavorites';
import { useStableCallback } from './useStableCallback';

/** Misafir uyarısından sonra giriş ekranına geçmeden önceki bekleme (toast okunabilsin). */
export const SIGN_IN_REDIRECT_MS = 1500;

/**
 * Ürün başına süren favori isteği — modül seviyesinde: aynı ürün kartta, başka bir rayda ve detayda
 * aynı anda dokunulsa da ikinci istek gitmez (çift dokunma ekle+çıkar yarışı yok).
 */
const inFlight = new Set<string>();

/**
 * Bekleyen misafir → giriş yönlendirmesi (modül seviyesinde TEK): art arda dokunuşlar yeni toast /
 * yeni zamanlayıcı kurmaz, giriş ekranı yığılmaz.
 */
let pendingSignIn: ReturnType<typeof setTimeout> | null = null;

/** Test yardımcısı: modül durumunu (bekleyen yönlendirme, süren istekler) sıfırlar. */
export function resetFavoriteToggleStateForTests() {
  if (pendingSignIn) clearTimeout(pendingSignIn);
  pendingSignIn = null;
  inFlight.clear();
}

export type FavoriteToggleResult = 'added' | 'removed' | 'failed' | 'signin' | 'busy';

/**
 * Şu anki kullanıcı (store'dan, render'dan bağımsız). Store sade bir fonksiyonla taklit edildiyse
 * (testler; `getState` yok) `fallback` döner — oturum değişmemiş sayılır.
 */
function liveUserId(fallback: string | null): string | null {
  const getState = (useAuthStore as { getState?: () => { user?: { id?: string | number } | null } }).getState;
  if (typeof getState !== 'function') return fallback;
  const id = getState().user?.id;
  return id ? String(id) : null;
}

/** Ürün detayı cache'i varsa beğeni sayısını ±1 (refetch YOK: görüntülenme yeniden sayılmasın). */
function bumpDetailLikeCount(qc: QueryClient, productId: string, delta: 1 | -1) {
  qc.setQueryData<{ likeCount?: number } | null | undefined>(qk.products.detail(productId), (p) =>
    p ? { ...p, likeCount: Math.max(0, (p.likeCount ?? 0) + delta) } : p,
  );
}

/**
 * Favori ekle/çıkar — ürün detayı ve ürün kartının TEK akışı (web `useProductFavorite` karşılığı).
 * - Misafir: `product.signInToFavorite` uyarısı + (ekran hâlâ odaktaysa) giriş ekranı; bekleyen
 *   yönlendirme varken yeni dokunuş yok sayılır.
 * - Favori listesi henüz gelmediyse (yükleniyor/hata) dokunuş yok sayılır: boş listeden karar
 *   verilip favorideki ürün yeniden "eklenmesin".
 * - Giriş yapmış: favorites cache'ine göre ekler ya da çıkarır (`useFavorites`: iyimser + rollback,
 *   409/404 toleransı, son yazımda tek invalidate), sonucu toast'la bildirir; detay cache'i varsa
 *   beğeni sayısını ±1 günceller. Ürün listeleri invalidate EDİLMEZ (pahalı).
 * - Yazım sürerken oturum değişirse (çıkış / başka hesap) sonuç bildirilmez, cache'e yazılmaz.
 * `toggle` kimliği sabittir (memo'lu kartlara geçirilebilir).
 */
export function useFavoriteToggle() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const navigation = useContext(NavigationContext);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userId = useAuthStore((s) => (s.user?.id ? String(s.user.id) : null));
  const { items, isInFavorites, isFavoritesLoaded, addToFavorites, removeFromFavorites } = useFavorites();
  const favoriteIds = useMemo(() => new Set(items.map((i) => String(i.productId))), [items]);

  const toggle = useStableCallback(async (productId: string): Promise<FavoriteToggleResult> => {
    if (!isAuthenticated) {
      if (pendingSignIn) return 'signin';
      toast.error(t('product.signInToFavorite'));
      pendingSignIn = setTimeout(() => {
        pendingSignIn = null;
        // Kullanıcı bu arada başka ekrana geçtiyse giriş ekranını araya sokma.
        if (navigation && !navigation.isFocused()) return;
        router.push('/(auth)/login');
      }, SIGN_IN_REDIRECT_MS);
      return 'signin';
    }
    if (!isFavoritesLoaded()) return 'busy';
    if (inFlight.has(productId)) return 'busy';
    inFlight.add(productId);
    const startedBy = userId;
    const wasFavorite = isInFavorites(productId);
    try {
      const ok = wasFavorite ? await removeFromFavorites(productId) : await addToFavorites(productId);
      // Çıkış / hesap değişimi: eski oturumun sonucunu bildirme, detay cache'ine yazma.
      if (liveUserId(startedBy) !== startedBy) return 'failed';
      if (!ok) {
        toast.error(t(wasFavorite ? 'product.favoriteRemoveFailed' : 'product.favoriteAddFailed'));
        return 'failed';
      }
      bumpDetailLikeCount(qc, productId, wasFavorite ? -1 : 1);
      toast.success(t(wasFavorite ? 'product.favoriteRemoved' : 'product.favoriteAdded'));
      return wasFavorite ? 'removed' : 'added';
    } catch {
      toast.error(t('utility.error500.title'));
      return 'failed';
    } finally {
      inFlight.delete(productId);
    }
  });

  return { favoriteIds, isAuthenticated, userId, toggle };
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
  const { favoriteIds, toggle, userId } = useFavoriteToggle();
  const onToggleFavorite = useCallback(
    (productId: string) => {
      void toggle(productId);
    },
    [toggle],
  );
  return useCallback(
    (product: FavoriteCardTarget): ProductCardFavoriteProps =>
      isOwnProduct(product, userId)
        ? NO_FAVORITE
        : { isFavorite: favoriteIds.has(String(product.id)), onToggleFavorite },
    [favoriteIds, onToggleFavorite, userId],
  );
}
