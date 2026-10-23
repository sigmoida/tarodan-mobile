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
 * Every home section query THROWS on failure instead of resolving to an empty value. React Query
 * then keeps the last good data on a failed refetch (pull-to-refresh, focus, reconnect) instead
 * of overwriting it with `[]`/`null` and making the section vanish, and retries a 5xx or network
 * error (`retryUnlessClientError`; the backoff keeps a skeleton or the refresh spinner up about
 * 3 s longer on a failure, like every other screen). On a first load the query ends in `error`
 * with no data: the section stays hidden (see `failedPopular`). A genuinely empty 200 still
 * resolves to `[]` / the body as is and renders as empty. Same idea as the manufacturers strip.
 */
const loadList = async (load: () => Promise<{ data: unknown }>) => toList((await load()).data);

/** Single-object sections (collector / business of the week): `null` when the API has none. */
const loadOne = async (load: () => Promise<{ data: unknown }>): Promise<any | null> => (await load()).data ?? null;

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
      // Like web: only listings with a real discount.
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

  /** Popular listings: the API sorts by view count (same endpoint as web). */
  const popular = useQuery({
    queryKey: qk.products.popular,
    queryFn: () => loadList(() => productsApi.getPopular({ limit: 20, page: 1 })),
  });

  /**
   * Brand strip: `/manufacturers` (with logos) like web, the same query as the Manufacturers screen.
   * Manufacturers without listings are left out (`select`; the cached raw list is unchanged). The
   * key is SHARED with the Manufacturers and Categories screens: a failure is never cached as a
   * "successful" `[]` (those screens must see the error); the query errors and the strip stays
   * empty without `data`.
   */
  const manufacturers = useQuery({
    queryKey: qk.catalog.manufacturers,
    queryFn: async () => unwrapList<HomeManufacturer>((await manufacturersApi.findAll()).data),
    select: selectWithListings,
  });

  const topCollections = useQuery({
    queryKey: qk.collections.top,
    queryFn: () => loadList(() => userApi.getTopCollections({ limit: 20 })),
  });

  const featuredCollector = useQuery({
    queryKey: qk.products.featuredCollector,
    queryFn: () => loadOne(() => userApi.getFeaturedCollector()),
  });

  const featuredBusiness = useQuery({
    queryKey: qk.products.featuredBusiness,
    queryFn: () => loadOne(() => userApi.getFeaturedBusiness()),
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
    /** Like web: without a collector of the week, the first top collection. */
    featuredCollector: featuredCollector.data ?? topCollections.data?.[0] ?? null,
    featuredBusiness: featuredBusiness.data ?? null,
    // Without a collector the first top collection is used, so that list is awaited too (no late jump).
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
