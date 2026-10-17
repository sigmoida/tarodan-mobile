import { useCallback, useMemo, useState } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { brandsApi, manufacturersApi, productsApi } from '@/lib/api';
import { qk } from '@/lib/query';
import { trimInfiniteToFirstPage } from '@/lib/query/infinite';
import type { ProductCardProduct } from '@/components/product';
import { extractListings, extractMeta, flattenUniqueListings } from '@/utils/productFilters';

/** Detay ızgarasının sayfa boyutu — arama / İlanlar ile aynı. */
export const ENTITY_PAGE_SIZE = 24;

export type CatalogEntityKind = 'brand' | 'manufacturer';

export interface CatalogEntity {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  description?: string;
  productCount?: number;
}

/**
 * Marka / üretici detayı: varlığı slug ile çözer, sonra ürünlerini `productsApi.getAll`
 * (`brandId` | `manufacturerId`, 24'lük sayfalar, sonsuz kaydırma) ile getirir. İki ekran (marka, üretici) tek kontrolcüyü paylaşır.
 */
export function useEntityProducts(kind: CatalogEntityKind, slug: string | undefined) {
  const isBrand = kind === 'brand';
  const queryClient = useQueryClient();

  const entityQuery = useQuery<CatalogEntity | null>({
    queryKey: isBrand ? qk.catalog.brand(slug ?? '') : qk.catalog.manufacturer(slug ?? ''),
    queryFn: async () => {
      if (!slug) return null;
      const response = isBrand
        ? await brandsApi.findBySlug(slug)
        : await manufacturersApi.findBySlug(slug);
      return response.data?.data ?? response.data ?? null;
    },
    enabled: !!slug,
  });
  const entity = entityQuery.data ?? null;

  const productsKey = isBrand
    ? qk.catalog.brandProducts(entity?.id)
    : qk.catalog.manufacturerProducts(entity?.id);

  // Sayfalı (sonsuz kaydırma) — eskiden sınırsız tek istek atılıyordu; sunucu varsayılan
  // sayfa boyutunda kesip kalanını hiç göstermiyordu. Arama/İlanlar ile aynı 24'lük sayfa.
  const productsQuery = useInfiniteQuery({
    queryKey: productsKey,
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      if (!entity?.id) return { items: [] as ProductCardProduct[], meta: extractMeta(null, 1, ENTITY_PAGE_SIZE) };
      const response = await productsApi.getAll({
        ...(isBrand ? { brandId: entity.id } : { manufacturerId: entity.id }),
        status: 'active',
        page: pageParam,
        limit: ENTITY_PAGE_SIZE,
      });
      // Zarf `{ data: [...], meta }` ya da iç içe `{ data: { products|data, meta } }` olabilir.
      const body = response.data;
      const nested = !Array.isArray(body?.data) && body?.data && typeof body.data === 'object';
      const raw = nested && !body.meta ? body.data : body;
      return {
        items: extractListings(raw) as ProductCardProduct[],
        meta: extractMeta(raw, pageParam, ENTITY_PAGE_SIZE),
      };
    },
    getNextPageParam: (last) =>
      last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined,
    enabled: !!entity?.id,
  });

  const products = useMemo(
    () => flattenUniqueListings(productsQuery.data?.pages),
    [productsQuery.data],
  );

  const { hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage, refetch } = productsQuery;
  const loadMore = useCallback(() => {
    // Sayfa hatasında kaydırdıkça otomatik yeniden denemez; kullanıcı "Tekrar dene" satırına basar.
    if (hasNextPage && !isFetchingNextPage && !isFetchNextPageError) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage]);
  const retryLoadMore = useCallback(() => void fetchNextPage(), [fetchNextPage]);

  // Çek-bırak: önce önbelleği ilk sayfaya kırp, sonra yenile → tek istek (arama ile aynı).
  // Gösterge yalnız kullanıcı çektiğinde döner (`isRefetching` arka plan tazelemesinde de true).
  const [refreshing, setRefreshing] = useState(false);
  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      trimInfiniteToFirstPage(queryClient, productsKey);
      await refetch();
    } finally {
      setRefreshing(false);
    }
    // productsKey her render'da yeni dizi; içeriği entity id'den türüyor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient, refetch, isBrand, entity?.id]);

  return {
    entity,
    products,
    // Varlık çözülmeden ürün sorgusu devre dışıdır (isLoading=false): boş durum erken çakmasın.
    loading: entityQuery.isLoading || (!!entity?.id && productsQuery.isPending),
    // Hata yalnız gösterilecek ürün YOKKEN tam ekran ErrorState olur. Sonraki sayfa / yenileme
    // hatasında yüklü ızgara korunur (ProductGrid hata gelince listeyi siliyordu); sayfa hatası
    // liste altındaki "Tekrar dene" satırıyla (`loadMoreFailed`) yeniden denenir.
    error: products.length === 0 ? productsQuery.error : null,
    refetch: refresh,
    /** Yalnız kullanıcının çek-bırak yenilemesi (sonraki sayfa / arka plan tazelemesi değil). */
    refreshing,
    loadMore,
    loadingMore: isFetchingNextPage,
    /** Sonraki sayfa yüklenemedi → liste altında "Tekrar dene" satırı. */
    loadMoreFailed: isFetchNextPageError,
    retryLoadMore,
  };
}
