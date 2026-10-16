import { useCallback, useMemo, useState } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/query';
import {
  flattenPagesUnique,
  nextPageFromInfo,
  readPageInfo,
  trimInfiniteToFirstPage,
  type PageInfo,
} from '@/lib/query/infinite';
import { ordersApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { FOCUS_LIST_STALE_MS, useRefetchStaleOnFocus } from '@/hooks/useRefetchStaleOnFocus';
import type { Sale, FilterType } from '../_lib/types';
import { saleBadgeStatus } from '../_lib/status';

/** Sayfa boyutu ve bellekte tutulan en çok sayfa (≈ eski tek seferlik 100 kayıt tavanı). */
const PAGE_SIZE = 20;
const MAX_PAGES = 5;

type SalesPage = PageInfo & { sales: Sale[] };

/**
 * Sales list controller — owns the seller-orders query, the filter-independent
 * earnings aggregate, filter state, pull-to-refresh and focus refetch. Lifted
 * verbatim from the monolithic screen (§12).
 */
export function useSales() {
  const { isAuthenticated } = useAuthStore();
  const [filter, setFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);

  const listKey = qk.orders.sellerList(filter);
  const queryClient = useQueryClient();
  const {
    data: salesData,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: listKey,
    initialPageParam: 1,
    // Hata yutulmaz: önbelleğe `[]` yazmak hatayı "satış yok" gibi gösteriyordu → ErrorState.
    queryFn: async ({ pageParam }): Promise<SalesPage> => {
      const page = pageParam as number;
      const params: any = { role: 'seller', limit: PAGE_SIZE, page };
      if (filter !== 'all') {
        // Mobil UI 'processing' adını kullanır; backend enum'u 'preparing'. Sınırda çevir.
        // 'cancelled' filtresi hem iptal (cancelled) hem para-iadesi (refunded) getirir.
        params.status =
          filter === 'processing' ? 'preparing'
          : filter === 'cancelled' ? 'cancelled,refunded'
          : filter;
      }
      const response = await ordersApi.getAll(params);
      const raw = (response.data as any)?.data || response.data || [];
      // Backend 'preparing' → mobil 'processing' (badge/aksiyon/filtre tek isimle çalışsın).
      const sales = (Array.isArray(raw) ? raw : []).map((o: any) =>
        o?.status === 'preparing' ? { ...o, status: 'processing' } : o,
      );
      return { sales, ...readPageInfo(response.data, page) };
    },
    getNextPageParam: nextPageFromInfo,
    maxPages: MAX_PAGES,
    enabled: isAuthenticated,
    // Yeni satış / durum değişimi alıcıdan gelir: dönüşte bundan eskiyse tazelenir.
    staleTime: FOCUS_LIST_STALE_MS,
  });

  // Sayfalar arası ofset kayması aynı satışı iki kez getirebilir → kimliğe göre tekilleştir.
  const sales: Sale[] = useMemo(
    () => flattenPagesUnique(salesData?.pages, (p) => p.sales, (sale) => sale.id),
    [salesData],
  );

  // Kazanç özeti — AKTİF FİLTREDEN BAĞIMSIZ sunucu agregatı. Önceden totalEarnings/
  // pendingEarnings filtrelenmiş + sayfalı `sales` listesinden hesaplanıyordu → 'paid'
  // filtresine basınca toplam kazanç 0'a düşüyordu. Artık tüm siparişler üzerinden tek sorgu.
  const { data: earningsResp } = useQuery({
    queryKey: qk.orders.sellerEarnings,
    queryFn: () => ordersApi.getSellerEarnings(),
    enabled: isAuthenticated,
  });
  const totalEarnings = earningsResp?.data?.totalEarnings ?? 0;
  const pendingEarnings = earningsResp?.data?.pendingEarnings ?? 0;

  // Ekrana dönüşte yalnız bayatsa tazele (liste + kazanç; ilk açılışta ikinci istek yok).
  useRefetchStaleOnFocus([qk.orders.all], isAuthenticated);

  // Çekip-yenile: önce ilk sayfaya kırp (refetch yüklü TÜM sayfaları sırayla çekerdi).
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      trimInfiniteToFirstPage(queryClient, listKey);
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const filteredSales = useMemo(
    () =>
      sales.filter((sale) => {
        if (filter === 'all') return true;
        const ui = saleBadgeStatus(sale);
        if (filter === 'cancelled') return ui === 'cancelled' || ui === 'refunded';
        return ui === filter;
      }),
    [sales, filter],
  );

  return {
    isAuthenticated,
    filter,
    setFilter,
    sales,
    filteredSales,
    isLoading,
    /** Liste alınamadı (önbellekte de yok) — "satış yok" değil, ErrorState + yeniden dene. */
    loadFailed: isError && !salesData,
    refetch,
    refreshing,
    onRefresh,
    loadMore,
    isFetchingNextPage,
    totalEarnings,
    pendingEarnings,
  };
}

export type SalesController = ReturnType<typeof useSales>;
