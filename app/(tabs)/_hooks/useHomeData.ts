import { useQuery } from '@tanstack/react-query';
import { manufacturersApi, productsApi, userApi } from '@/lib/api';
import { unwrapList } from '@/lib/api/unwrap';
import { qk } from '@/lib/query';
import { selectWithListings, type ListingCountCarrier } from '@/utils/catalogListings';

interface HomeManufacturer extends ListingCountCarrier {
  id: string;
  name: string;
  slug?: string;
  logo?: string | null;
}
import {
  getProductEffectivePrice,
  getProductOriginalPriceForDisplay,
  isProductOnSaleDisplay,
} from '@/utils/productPrice';

/** Uç `[...]`, `{ data: [...] }` ya da `{ products: [...] }` dönebilir (web `unwrapList`). */
const toList = (body: any): any[] => {
  const list = body?.data ?? body?.products ?? body ?? [];
  return Array.isArray(list) ? list : [];
};

/**
 * Product rails: a failure THROWS (unlike `safeList`). React Query then keeps the last good list
 * on a failed refetch (pull-to-refresh, focus, reconnect) instead of overwriting it with `[]` and
 * making the rail vanish, and retries a 5xx (`retryUnlessClientError`). On a first load the query
 * ends in `error` with no data: the rail stays hidden (see `failedPopular`). A genuinely empty
 * 200 still resolves to `[]` and renders as empty. Same idea as the manufacturers strip below.
 */
const loadList = async (load: () => Promise<{ data: unknown }>) => toList((await load()).data);

/** A failure leaves the section empty without breaking the screen (web `Promise.allSettled`); used by the non-product sections. */
const safeList = async (load: () => Promise<{ data: unknown }>) => {
  try {
    return await loadList(load);
  } catch {
    return [];
  }
};

const safeOne = async (load: () => Promise<{ data: unknown }>): Promise<any | null> => {
  try {
    return (await load()).data ?? null;
  } catch {
    return null;
  }
};

/**
 * Anasayfa içerik sorguları — web `app/page.tsx` ile aynı uçlar: Öne Çıkan (homeShowcase),
 * İndirimdekiler, Takas Vitrini, Popüler, Üreticiler (marka şeridi), En İyi Koleksiyonlar,
 * Haftanın Koleksiyoneri / Şirketi.
 */
export function useHomeData() {
  const featured = useQuery({
    queryKey: qk.products.homeFeatured,
    queryFn: () =>
      loadList(() => productsApi.getAll({ limit: 20, page: 1, homeShowcase: true, status: 'active' })),
  });

  const onSale = useQuery({
    queryKey: qk.products.homeOnSale,
    queryFn: async () => {
      const list = await loadList(() =>
        productsApi.getAll({ limit: 24, page: 1, discountOnly: true, status: 'active' }),
      );
      // Web gibi: yalnız gerçek indirimi olanlar.
      return list.filter(
        (p) => isProductOnSaleDisplay(p) && getProductOriginalPriceForDisplay(p) > getProductEffectivePrice(p),
      );
    },
  });

  const trade = useQuery({
    queryKey: qk.products.homeTrade,
    queryFn: () =>
      loadList(() => productsApi.getAll({ limit: 24, page: 1, tradeOnly: true, status: 'active' })),
  });

  /** Popüler ilanlar — backend görüntülenme sayısına göre sıralar (web ile aynı uç). */
  const popular = useQuery({
    queryKey: qk.products.popular,
    queryFn: () => loadList(() => productsApi.getPopular({ limit: 20, page: 1 })),
  });

  /**
   * Marka şeridi — web gibi `/manufacturers` (logolu). Üreticiler ekranıyla aynı sorgu.
   * İlanı olmayan üretici şeritte yok (`select`; önbellekteki ham liste değişmez). Anahtar Üreticiler
   * ve Kategoriler ekranlarıyla PAYLAŞILIR: hata `safeList` gibi `[]`'a çevrilip "başarılı" diye
   * önbelleğe YAZILMAZ (diğer ekranlar hatayı görsün); sorgu hata verir, şerit `data` olmadan boş kalır.
   */
  const manufacturers = useQuery({
    queryKey: qk.catalog.manufacturers,
    queryFn: async () => unwrapList<HomeManufacturer>((await manufacturersApi.findAll()).data),
    select: selectWithListings,
  });

  const topCollections = useQuery({
    queryKey: qk.collections.top,
    queryFn: () => safeList(() => userApi.getTopCollections({ limit: 20 })),
  });

  const featuredCollector = useQuery({
    queryKey: qk.products.featuredCollector,
    queryFn: () => safeOne(() => userApi.getFeaturedCollector()),
  });

  const featuredBusiness = useQuery({
    queryKey: qk.products.featuredBusiness,
    queryFn: () => safeOne(() => userApi.getFeaturedBusiness()),
  });

  return {
    featured: featured.data ?? [],
    loadingFeatured: featured.isLoading,
    onSale: onSale.data ?? [],
    loadingOnSale: onSale.isLoading,
    trade: trade.data ?? [],
    loadingTrade: trade.isLoading,
    popular: popular.data ?? [],
    loadingPopular: popular.isLoading,
    /**
     * The popular rail never loaded (first load failed, no data): hide it instead of showing the
     * "be the first" empty state, which would be false. A failed refetch keeps the data, so this
     * stays false then.
     */
    failedPopular: popular.isError && popular.data === undefined,
    manufacturers: manufacturers.data ?? [],
    loadingManufacturers: manufacturers.isLoading,
    topCollections: topCollections.data ?? [],
    loadingTopCollections: topCollections.isLoading,
    /** Web gibi: haftanın koleksiyoneri yoksa en iyi koleksiyonların ilki. */
    featuredCollector: featuredCollector.data ?? topCollections.data?.[0] ?? null,
    featuredBusiness: featuredBusiness.data ?? null,
    // Koleksiyoner yoksa en iyi koleksiyonların ilkine düşülür → o liste de beklenir (geç gelip zıplamasın).
    loadingSpotlights:
      featuredCollector.isLoading ||
      featuredBusiness.isLoading ||
      (!featuredCollector.data && topCollections.isLoading),
    refetchAll: async () => {
      await Promise.all([
        featured.refetch(),
        onSale.refetch(),
        trade.refetch(),
        popular.refetch(),
        topCollections.refetch(),
        featuredCollector.refetch(),
        featuredBusiness.refetch(),
      ]);
    },
  };
}
