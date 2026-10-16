import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ordersApi } from '@/lib/api';
import { qk } from '@/lib/query';
import { useAuthStore } from '@/stores/authStore';
import { FOCUS_LIST_STALE_MS, useRefetchStaleOnFocus } from '@/hooks/useRefetchStaleOnFocus';
import { apiStatusToUi, uiFilterToApiStatusParam } from '@/utils/orderStatus';
import {
  normalizeOrder,
  type Order,
  type OrderListEntry,
  type FilterType,
} from '../_lib/ordersStatus';

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

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  // Fetch orders.
  // Alıcı + "Tümü" / "İptal edilenler": gruplu liste (tek checkout = tek kart, çok
  // ürün destekli) — web gibi `GET /orders/groups?tab=active|cancelled`. Sunucu
  // `active` sekmesinde iptalleri DIŞLAR; iptaller yalnız `cancelled` sekmesinde gelir.
  // Diğer filtreler: düz sipariş listesi (durum filtreli).
  const groupTab = filter === 'all' ? 'active' : filter === 'cancelled' ? 'cancelled' : null;
  const { data: ordersData, isLoading, refetch, error: ordersError } = useQuery({
    queryKey: qk.orders.list({ role, filter }),
    queryFn: async (): Promise<OrderListEntry[]> => {
      if (groupTab) {
        const response = await ordersApi.getGroups({ role, tab: groupTab, limit: 50, page: 1 });
        const raw = response.data?.data ?? response.data;
        const list = Array.isArray(raw) ? raw : [];
        return list.map((rawGroup: any): OrderListEntry => {
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
      }

      const params: Record<string, string | number> = { role, limit: 100, page: 1 };
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
      return normalized.map((order): OrderListEntry => ({ kind: 'order', order }));
    },
    enabled: isAuthenticated,
    // Durumu satıcı/kargo değiştirir: dönüşte bundan eskiyse tazelenir (odak etkisi aşağıda).
    staleTime: FOCUS_LIST_STALE_MS,
  });

  const entries: OrderListEntry[] = ordersData || [];

  // Ekrana dönüşte yalnız bayatsa tazele (her odakta değil; ilk açılışta ikinci istek yok).
  useRefetchStaleOnFocus([qk.orders.all], isAuthenticated);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

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
  };
}

export type OrdersController = ReturnType<typeof useOrders>;
