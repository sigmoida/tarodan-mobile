import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supportApi } from '@/lib/api';
import { qk } from '@/lib/query';
import { useAuthStore } from '@/stores/authStore';
import { FOCUS_LIST_STALE_MS, useRefetchStaleOnFocus } from '@/hooks/useRefetchStaleOnFocus';
import type { TicketSummary } from '../_lib/types';

/**
 * Destek talepleri listesi — sorgu, çekip yenileme ve odağa dönünce (bayatsa) tazeleme. Önceki ekrandan
 * AYNEN taşındı (yalnız sorgu anahtarı merkezi kayıttan: `qk.support.mine`, değer aynı).
 */
export function useSupportTickets() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: qk.support.mine,
    queryFn: async () => {
      // api interceptor yanıtı unwrap etmez → res.data backend gövdesi.
      // getUserTickets { tickets, total, page, pageSize } döndürür.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res: any = await supportApi.getMyTickets({ page: 1, pageSize: 50 });
      const payload = res?.data ?? res;
      const list = payload?.tickets ?? payload?.data ?? (Array.isArray(payload) ? payload : []);
      return list as TicketSummary[];
    },
    enabled: isAuthenticated,
    // Yanıtlar destek ekibinden gelir: dönüşte bundan eskiyse tazelenir.
    staleTime: FOCUS_LIST_STALE_MS,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Ekrana dönüşte yalnız bayatsa tazele. Yeni talep / yanıt `qk.support.tickets`'i invalidate
  // ettiği için onlardan dönüşte liste yine tazelenir.
  useRefetchStaleOnFocus([qk.support.mine], isAuthenticated);

  return {
    isAuthenticated,
    tickets: data ?? [],
    isLoading,
    /** Liste alınamadı ve önbellekte veri yok — "talep yok" değil, ErrorState. */
    loadFailed: isError && !data,
    retry: () => {
      void refetch();
    },
    refreshing,
    onRefresh,
  };
}
