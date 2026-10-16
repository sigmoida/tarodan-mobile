import { useCallback, useMemo, useState } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '@/lib/api';
import { qk } from '@/lib/query';
import {
  flattenPagesUnique,
  nextPageFromInfo,
  readPageInfo,
  trimInfiniteToFirstPage,
  type PageInfo,
} from '@/lib/query/infinite';
import { useAuthStore } from '@/stores/authStore';
import { FOCUS_LIST_STALE_MS, useRefetchStaleOnFocus } from '@/hooks/useRefetchStaleOnFocus';
import { apiStatusToUi, uiFilterToApiStatusParam } from '@/utils/orderStatus';
import {
  normalizeOrder,
  type Order,
  type OrderListEntry,
  type FilterType,
} from '../_lib/ordersStatus';

/** Sayfa boyutu (sunucu `groups` ucu en çok 50, `orders` ucu en çok 100 verir). */
const PAGE_SIZE = 20;
/** Bellekte tutulan en çok sayfa (≈ eski tek seferlik 100 kayıt tavanı). */
const MAX_PAGES = 5;
/** "Hazırlanıyor" sunucuda süzülemez (istemci süzer) → sayfalama yerine tek sefer çekilir. */
const CLIENT_FILTER_LIMIT = 100;

type OrdersPage = PageInfo & { entries: OrderListEntry[] };

const entryKey = (e: OrderListEntry): string => (e.kind === 'order' ? e.order.id : e.group.id);

/**
 * Orders (buyer) controller — owns the grouped/flat orders query, focus
 * refresh, filter + accordion state. Lifted verbatim
 * from the monolithic OrdersScreen.
 */
export function useOrders() {
  const { isAuthenticated } = useAuthStore();
  // Bu ekran alıcı-only (Siparişlerim). Satıcı satışları /sales'te.
  const role: 'buyer' | 'seller' = 'buyer';
  const [filter, setFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);
  // Çok ürünlü grup accordion durumu — varsayılan KAPALI (boş Set)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }, []);

  // Fetch orders.
  // Alıcı + "Tümü" / "İptal edilenler": gruplu liste (tek checkout = tek kart, çok
  // ürün destekli) — web gibi `GET /orders/groups?tab=active|cancelled`. Sunucu
  // `active` sekmesinde iptalleri DIŞLAR; iptaller yalnız `cancelled` sekmesinde gelir.
  // Diğer filtreler: düz sipariş listesi (durum filtreli).
  const groupTab = filter === 'all' ? 'active' : filter === 'cancelled' ? 'cancelled' : null;
  const listKey = qk.orders.list({ role, filter });
  const {
    data: ordersData,
    isLoading,
    refetch,
    error: ordersError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: listKey,
    initialPageParam: 1,
    queryFn: async ({ pageParam }): Promise<OrdersPage> => {
      const page = pageParam as number;
      if (groupTab) {
        const response = await ordersApi.getGroups({ role, tab: groupTab, limit: PAGE_SIZE, page });
        const raw = response.data?.data ?? response.data;
        const list = Array.isArray(raw) ? raw : [];
        const groupEntries = list.map((rawGroup: any): OrderListEntry => {
          const groupOrders: Order[] = (rawGroup.orders || []).map(normalizeOrder);
          // Tek ürünlü grup → klasik sipariş kartı (mevcut UX korunur)
          if (groupOrders.length === 1) {
            return { kind: 'order', order: groupOrders[0] };
          }
          return {
            kind: 'group',
            group: {
              id: rawGroup.id,
              groupNumber: rawGroup.groupNumber,
              totalAmount: Number(rawGroup.totalAmount ?? 0),
              status:
                rawGroup.status === 'mixed' ? 'mixed' : apiStatusToUi(rawGroup.status),
              createdAt: rawGroup.createdAt,
              orders: groupOrders,
            },
          };
        });
        return { entries: groupEntries, ...readPageInfo(response.data, page) };
      }

      // "Hazırlanıyor": istemci süzgeci sayfa başına boş sonuç verebilir → tek sefer, sayfalama yok.
      const clientFiltered = filter === 'processing';
      const params: Record<string, string | number> = {
        role,
        limit: clientFiltered ? CLIENT_FILTER_LIMIT : PAGE_SIZE,
        page,
      };
      if (filter === 'refunds') {
        // "İadeler" sekmesi: iade talebi olan tüm siparişler (status'tan bağımsız;
        // iade tamamlanınca sipariş cancelled olduğu için status filtresiyle gelmez).
        params.refundsOnly = 'true';
      } else {
        const apiStatus = uiFilterToApiStatusParam(filter);
        if (apiStatus) params.status = apiStatus;
      }

      const response = await ordersApi.getAll(params);
      const raw = response.data?.data ?? response.data;
      const list = Array.isArray(raw) ? raw : [];

      let normalized: Order[] = list.map(normalizeOrder);
      if (filter === 'processing') {
        normalized = normalized.filter((o) => o.status === 'processing');
      }
      return {
        entries: normalized.map((order): OrderListEntry => ({ kind: 'order', order })),
        ...(clientFiltered ? { page: 1, totalPages: 1 } : readPageInfo(response.data, page)),
      };
    },
    getNextPageParam: nextPageFromInfo,
    maxPages: MAX_PAGES,
    enabled: isAuthenticated,
    // Durumu satıcı/kargo değiştirir: dönüşte bundan eskiyse tazelenir (odak etkisi aşağıda).
    staleTime: FOCUS_LIST_STALE_MS,
  });

  // Sayfalar arası ofset kayması aynı kaydı iki kez getirebilir → anahtara göre tekilleştir.
  const entries: OrderListEntry[] = useMemo(
    () => flattenPagesUnique(ordersData?.pages, (p) => p.entries, entryKey),
    [ordersData],
  );

  // Ekrana dönüşte yalnız bayatsa tazele (her odakta değil; ilk açılışta ikinci istek yok).
  useRefetchStaleOnFocus([qk.orders.all], isAuthenticated);

  // Çekip-yenile: önce ilk sayfaya kırp (refetch yüklü TÜM sayfaları sırayla çekerdi).
  const queryClient = useQueryClient();
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

  return {
    isAuthenticated,
    filter,
    setFilter,
    refreshing,
    onRefresh,
    expandedGroups,
    toggleGroup,
    entries,
    isLoading,
    ordersError,
    refetch,
    loadMore,
    isFetchingNextPage,
  };
}

export type OrdersController = ReturnType<typeof useOrders>;
