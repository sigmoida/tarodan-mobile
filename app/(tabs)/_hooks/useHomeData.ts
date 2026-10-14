import { useQuery } from '@tanstack/react-query';
import { manufacturersApi, productsApi, userApi } from '@/lib/api';
import { qk } from '@/lib/query';
import { selectWithListings } from '@/utils/catalogListings';
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

/** Hata bir bölümü boş bırakır, ekranı bozmaz (web `Promise.allSettled`). */
const safeList = async (load: () => Promise<{ data: unknown }>): Promise<any[]> => {
  try {
    return toList((await load()).data);
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
      safeList(() => productsApi.getAll({ limit: 20, page: 1, homeShowcase: true, status: 'active' })),
  });

  const onSale = useQuery({
    queryKey: qk.products.homeOnSale,
    queryFn: async () => {
      const list = await safeList(() =>
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
      safeList(() => productsApi.getAll({ limit: 24, page: 1, tradeOnly: true, status: 'active' })),
  });

  /** Popüler ilanlar — backend görüntülenme sayısına göre sıralar (web ile aynı uç). */
  const popular = useQuery({
    queryKey: qk.products.popular,
    queryFn: () => safeList(() => productsApi.getPopular({ limit: 20, page: 1 })),
  });

  /**
   * Marka şeridi — web gibi `/manufacturers` (logolu). Üreticiler ekranıyla aynı sorgu.
   * İlanı olmayan üretici şeritte yok (`select`; önbellekteki ham liste değişmez).
   */
  const manufacturers = useQuery({
    queryKey: qk.catalog.manufacturers,
    queryFn: () => safeList(() => manufacturersApi.findAll()),
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
    manufacturers: manufacturers.data ?? [],
    topCollections: topCollections.data ?? [],
    loadingTopCollections: topCollections.isLoading,
    /** Web gibi: haftanın koleksiyoneri yoksa en iyi koleksiyonların ilki. */
    featuredCollector: featuredCollector.data ?? topCollections.data?.[0] ?? null,
    featuredBusiness: featuredBusiness.data ?? null,
    loadingSpotlights: featuredCollector.isLoading || featuredBusiness.isLoading,
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
