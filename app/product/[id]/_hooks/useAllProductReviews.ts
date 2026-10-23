import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { ratingsApi } from '@/lib/api';
import { qk } from '@/lib/query';
import type { ProductReview } from '../_lib/types';

const PAGE_SIZE = 20;

/** `GET /ratings/products/:id` page: a bare list or an envelope (field name varies by API version). */
type RatingsPayload =
  | ProductReview[]
  | { ratings?: ProductReview[]; items?: ProductReview[]; data?: ProductReview[]; total?: number };

/** Değerlendirmeler ekranı: sayfalı liste (GET /ratings/products/:id) + puan özeti (…/stats). */
export function useAllProductReviews(productId: string, enabled: boolean) {
  const stats = useQuery({
    queryKey: qk.products.ratingStats(productId),
    enabled,
    queryFn: async () => {
      try {
        const res = await ratingsApi.getProductStats(productId);
        return res.data ?? null;
      } catch {
        return null;
      }
    },
  });

  const list = useInfiniteQuery({
    queryKey: qk.products.reviewsAll(productId),
    initialPageParam: 1,
    enabled,
    queryFn: async ({ pageParam }) => {
      const res = await ratingsApi.getProductRatings(productId, { page: pageParam, pageSize: PAGE_SIZE });
      const d = res.data as RatingsPayload | undefined;
      const items: ProductReview[] = Array.isArray(d) ? d : (d?.ratings ?? d?.items ?? d?.data ?? []);
      const total: number = (Array.isArray(d) ? undefined : d?.total) ?? items.length;
      return { items, total, page: Number(pageParam) };
    },
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, p) => sum + p.items.length, 0);
      return loaded < lastPage.total ? lastPage.page + 1 : undefined;
    },
    // NOT: `maxPages` bilerek YOK (`useSearch` ile aynı gerekçe): ekran `fetchPreviousPage`
    // çağırmaz, ~100 satırdan sonra 1. sayfa düşünce liste sıçrıyordu (ayrıca `getNextPageParam`
    // tüm sayfaların toplamını sayar). Bellek FlatList pencerelemesiyle (`listWindowing`) sınırlı.
  });

  const reviews: ProductReview[] = (list.data?.pages ?? []).flatMap((p) => p.items);
  const total = list.data?.pages?.[0]?.total ?? reviews.length;
  const average: number | null = stats.data?.averageScore ?? stats.data?.averageRating ?? null;

  return {
    reviews,
    total,
    average,
    isLoading: list.isLoading,
    /** The list never loaded: the screen shows ErrorState with a retry, not "no reviews". */
    loadFailed: list.isError && list.data === undefined,
    hasNextPage: list.hasNextPage,
    isFetchingNextPage: list.isFetchingNextPage,
    /** Sonraki sayfa yüklenemedi → liste altında "Tekrar dene" satırı. */
    isFetchNextPageError: list.isFetchNextPageError,
    fetchNextPage: list.fetchNextPage,
    refetch: list.refetch,
  };
}
