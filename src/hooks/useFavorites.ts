import { logger, safeError } from '@/services/logger';
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { wishlistApi } from '@/lib/api';
import { qk } from '@/lib/query';
import { useAuthStore } from '@/stores/authStore';

export interface WishlistItem {
  id: string;
  productId: string;
  product: {
    id: string;
    title: string;
    price: number;
    /** The pre-discount price (server `productOriginalPrice`; set only during a campaign discount). */
    originalPrice?: number;
    images: Array<{ url: string }>;
    condition: string;
    status: string;
    /** Units still buyable (`GET /wishlist` `availableQuantity`). Missing = unlimited stock. */
    availableQuantity?: number;
    /**
     * Most units one order may hold (`GET /wishlist` `maxQuantityPerOrder`). Missing = no per-order
     * limit. The cart line added from Favorites carries it (`cartItemFromListing`).
     */
    maxQuantityPerOrder?: number;
    seller: {
      /** Missing when the row has no seller id; never `''` (the card rule and cart line read it as a real id). */
      id?: string;
      displayName: string;
    };
  };
  addedAt: string;
}

/** Veri yokken sabit boş liste: `items` kimliği render'lar arasında değişmez (türetilen Set/memo'lar boşuna yenilenmez). */
const NO_ITEMS: WishlistItem[] = [];

/**
 * Süren favori yazımı (ekle/çıkar) sayısı — modül seviyesinde, tüm ekranlar ortak. Her yazım bitince
 * değil, SON yazım bitince tek bir invalidate atılır: hızlı "A ekle / B çıkar"da A'nın tazelemesi
 * B'nin iyimser çıkarımını geri getiremez.
 */
let activeWrites = 0;

/**
 * Yazımın başladığı oturum: o anki favori sorgusu örneği + kullanıcı. Çıkışta `queryClient.clear()`
 * sorguyu siler (yenisi farklı örnek) ve kullanıcı değişir — uçuştaki yazım dönünce eski kullanıcının
 * öğesini cache'e geri yazmaz, token'sız tazeleme atmaz.
 */
interface WriteSession {
  query: unknown;
  userId: string | null;
}

function currentUserId(): string | null {
  // Testlerde store sade bir fonksiyonla taklit edilebilir (getState yok) → yalnız sorgu örneği karşılaştırılır.
  const id = useAuthStore.getState?.()?.user?.id;
  return id ? String(id) : null;
}

function writeSession(qc: QueryClient): WriteSession {
  return { query: qc.getQueryCache().find({ queryKey: qk.favorites.all, exact: true }), userId: currentUserId() };
}

function isSameSession(qc: QueryClient, s: WriteSession): boolean {
  const now = writeSession(qc);
  return now.query === s.query && now.userId === s.userId;
}

/** Ürün kimliği karşılaştırması tek yerde (sunucu sayı/string dönebilir). */
const sameProduct = (a: unknown, b: unknown) => String(a) === String(b);

/** Pozitif sonlu sayı (string de kabul) ya da `undefined`. */
function toPositiveNumber(v: unknown): number | undefined {
  const n = typeof v === 'string' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : undefined;
}

/**
 * Units still buyable (string accepted). Only a missing field (`null`, `undefined`, `''`) means
 * unlimited stock (`undefined`). The API never sends a negative or non-numeric value (its
 * `getAvailableQuantity` clamps at 0), so such a value fails closed to 0 (out of stock) instead of
 * reading as unlimited.
 */
function toQuantity(v: unknown): number | undefined {
  if (v == null || v === '') return undefined;
  const n = typeof v === 'string' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

/** A present id as a string (the server may send a number); a missing or empty one is `undefined`. */
function toOptionalId(v: unknown): string | undefined {
  return v == null || v === '' ? undefined : String(v);
}

/** The per-order cap: a positive integer (string accepted), else `undefined` (no per-order limit). */
function toPerOrderCap(v: unknown): number | undefined {
  const n = toPositiveNumber(v);
  return n !== undefined && Number.isInteger(n) ? n : undefined;
}

/**
 * Maps the `GET /wishlist` response to `WishlistItem[]`. The backend may return items with flat
 * fields (productTitle/productImage...) or with a nested `product`; both shapes are accepted.
 *
 * Takes `t` (so the fallback product and seller names are translated): a pure function cannot call
 * `useTranslation`, so the caller passes the live `t` (same reason as the top of `@/utils/validation`).
 */
export function mapWishlist(data: any, t: TFunction): WishlistItem[] {
  const wishlistData = data?.items || data?.data || data || [];
  return (Array.isArray(wishlistData) ? wishlistData : [])
    .filter((item: any) => item && item.productId)
    .map((item: any) => ({
      id: item.id,
      productId: item.productId,
      product: {
        id: item.productId,
        title: item.productTitle || item.product?.title || t('product.productFallback'),
        price: item.productPrice || item.product?.price || 0,
        originalPrice: toPositiveNumber(item.productOriginalPrice ?? item.product?.originalPrice ?? item.product?.oldPrice),
        images: item.productImage ? [{ url: item.productImage }] : (item.product?.images || []),
        condition: item.productCondition || item.product?.condition || 'good',
        status: item.productStatus || item.product?.status || 'active',
        availableQuantity: toQuantity(item.availableQuantity ?? item.product?.availableQuantity),
        maxQuantityPerOrder: toPerOrderCap(item.maxQuantityPerOrder ?? item.product?.maxQuantityPerOrder),
        seller: {
          id: toOptionalId(item.sellerId || item.product?.seller?.id),
          displayName: item.sellerName || item.product?.seller?.displayName || t('product.seller'),
        },
      },
      addedAt: item.addedAt || item.added_at || new Date().toISOString(),
    }));
}

/**
 * Favoriler (wishlist) — React Query destekli. Eskiden `favoritesStore` (fetch
 * eden zustand) yapıyordu; Faz 1'de tek server-state disiplinine (TanStack Query)
 * taşındı. Davranış birebir korunur: optimistic ekle/çıkar, 409 idempotent, 404
 * toleransı, rollback. Public API (items/isInFavorites/addToFavorites…) store ile
 * aynıdır; böylece tüketiciler neredeyse değişmeden çalışır.
 *
 * Çıkışta reset: `resetUserStores` zaten `queryClient.clear()` çağırır → favori
 * cache'i de temizlenir (ayrı reset gerekmez).
 */
export function useFavorites() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const query = useQuery({
    queryKey: qk.favorites.all,
    enabled: isAuthenticated,
    queryFn: async (): Promise<WishlistItem[]> => {
      try {
        const response = await wishlistApi.get();
        return mapWishlist(response.data, t);
      } catch (error: any) {
        // Boş wishlist 404 dönebilir — hata değil, boş liste.
        if (error?.response?.status === 404) return [];
        throw error;
      }
    },
  });

  const items: WishlistItem[] = query.data ?? NO_ITEMS;

  // İmperatif kontroller cache'i TAZE okur (closure `items` bayat kalabilir; ör.
  // fetchFavorites().then(() => isInFavorites(id)) akışında sync sonuç şart).
  const readCache = (): WishlistItem[] => qc.getQueryData<WishlistItem[]>(qk.favorites.all) ?? [];

  const isInFavorites = (productId: string) => readCache().some((i) => sameProduct(i.productId, productId));
  /** Favori listesi en az bir kez geldi mi (yükleniyor/hatalıyken ekle-çıkar kararı verilemez). */
  const isFavoritesLoaded = () => qc.getQueryData<WishlistItem[]>(qk.favorites.all) !== undefined;

  /**
   * Yazım başlangıcı: süren tazelemeyi iptal et (iyimser yazımı ezmesin), sayaç++ ve oturumu yakala.
   * Bitişte sayaç--; son yazımsa ve oturum aynıysa TEK invalidate (sunucuyla eşitle).
   */
  const beginWrite = async (): Promise<WriteSession> => {
    activeWrites += 1;
    const session = writeSession(qc);
    await qc.cancelQueries({ queryKey: qk.favorites.all, exact: true });
    return session;
  };
  const endWrite = (session: WriteSession) => {
    activeWrites = Math.max(0, activeWrites - 1);
    if (activeWrites === 0 && isSameSession(qc, session)) {
      void qc.invalidateQueries({ queryKey: qk.favorites.all, exact: true });
    }
  };
  /** Yalnız yazımın oturumu sürüyorsa cache'e yaz (çıkış sonrası eski kullanıcının öğesi geri gelmez). */
  const writeIfSameSession = (session: WriteSession, update: (cur: WishlistItem[]) => WishlistItem[]) => {
    if (!isSameSession(qc, session)) return;
    qc.setQueryData<WishlistItem[]>(qk.favorites.all, (cur) => update(cur ?? []));
  };
  const getFavoriteCount = () => items.length;

  const fetchFavorites = () => query.refetch();

  // Web ile aynı endpoint: POST /wishlist
  const addToFavorites = async (productId: string): Promise<boolean> => {
    const session = await beginWrite();
    // Optimistic: anında listeye ekle ki kalp ikonu/badge hemen güncellensin.
    const prev = readCache();
    const alreadyThere = prev.some((i) => sameProduct(i.productId, productId));
    if (!alreadyThere) {
      const optimisticItem: WishlistItem = {
        id: `temp-${productId}`,
        productId,
        product: {
          id: productId,
          title: t('product.productFallback'),
          price: 0,
          images: [],
          condition: 'good',
          status: 'active',
          seller: { displayName: t('product.seller') },
        },
        addedAt: new Date().toISOString(),
      };
      qc.setQueryData<WishlistItem[]>(qk.favorites.all, [...prev, optimisticItem]);
    }

    try {
      await wishlistApi.add(productId);
      // Gerçek veriyle eşitleme `endWrite`'ta: son yazım bitince tek invalidate (placeholder'ı değiştirir).
      return true;
    } catch (error: any) {
      /**
       * Zaten wishlist'te ise yine başarı.
       *
       * Sunucu ASLINDA idempotent: staging'de ölçüldü (2026-08-26) — aynı ürünü
       * ikinci kez eklemek `201` ve aynı satırı döndürüyor, hata atmıyor. Bu dal
       * yalnızca bir emniyet kemeri.
       *
       * Eskiden ikinci bir koşul daha vardı: `message.includes('zaten')`. İstemci
       * artık `Accept-Language` gönderdiği için sunucu mesajı İngilizce'ye
       * dönebiliyor ve o kontrol sessizce tutmaz olurdu — metne bakan bir kural
       * çeviriyle birlikte bozulur. Durum kodu dilden bağımsız.
       */
      if (error?.response?.status === 409) return true;
      // Rollback optimistic ekleme.
      writeIfSameSession(session, (cur) => cur.filter((i) => !sameProduct(i.productId, productId)));
      return false;
    } finally {
      endWrite(session);
    }
  };

  // Web ile aynı endpoint: DELETE /wishlist/:productId
  const removeFromFavorites = async (productId: string): Promise<boolean> => {
    const session = await beginWrite();
    // Optimistic: anında listeden düş (add ile simetrik).
    const prev = readCache();
    const removed = prev.filter((item) => sameProduct(item.productId, productId));
    qc.setQueryData<WishlistItem[]>(qk.favorites.all, prev.filter((item) => !sameProduct(item.productId, productId)));

    try {
      await wishlistApi.remove(productId);
      return true;
    } catch (error: any) {
      // Bulunamadıysa server'da zaten silinmiş — yerel silmeyi koru.
      if (error?.response?.status === 404) {
        return true;
      }
      // Rollback optimistic çıkarma.
      writeIfSameSession(session, (cur) => [...cur, ...removed]);
      return false;
    } finally {
      endWrite(session);
    }
  };

  // Web ile aynı endpoint: DELETE /wishlist
  const clearFavorites = async (): Promise<void> => {
    try {
      await wishlistApi.clear();
      qc.setQueryData<WishlistItem[]>(qk.favorites.all, []);
    } catch (error) {
      logger.error('Failed to clear favorites', { err: safeError(error) });
    }
  };

  return {
    items,
    isLoading: query.isLoading,
    error: query.isError ? t('favorites.loadFailed') : null,
    isInFavorites,
    isFavoritesLoaded,
    getFavoriteCount,
    fetchFavorites,
    addToFavorites,
    removeFromFavorites,
    clearFavorites,
  };
}
