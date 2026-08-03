import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { appAlert } from '@/ui';
import { refundsApi } from '@/lib/api';
import { captureException } from '@/services/sentry';
import { useAuthStore } from '@/stores/authStore';
import { readList } from '@/utils/apiEnvelope';
import type { RefundRequestRow, RefundTab } from '../_lib/types';

/**
 * İade talepleri listesinin controller'ı.
 *
 * İki sekme, tek sorgu: `queryKey` sekmeyi içerdiği için sekme değişince
 * React Query kendi başına doğru listeyi çeker — ayrı state ya da manuel
 * `refetch` gerekmiyor.
 *
 * ⚠️ Satıcı sekmesi SALT OKUNUR. `POST /refund-requests/:id/cancel` alıcıya
 * ait; API'de satıcı için onay/ret ucu yok (üretilen katalogda yalnız beş
 * iade ucu var), o yüzden iptal mutation'ı yalnız alıcı sekmesinde açılır.
 */
export function useRefundRequests() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<RefundTab>('buyer');

  const query = useQuery({
    queryKey: ['refund-requests', tab],
    queryFn: async () => {
      const res = await (tab === 'seller' ? refundsApi.getSeller() : refundsApi.getMine());
      return readList<RefundRequestRow>(res);
    },
    enabled: isAuthenticated,
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => refundsApi.cancel(id),
    onSuccess: () => {
      appAlert('İptal edildi', 'İade talebiniz iptal edildi.');
      queryClient.invalidateQueries({ queryKey: ['refund-requests'] });
    },
    onError: (e: any) => {
      captureException(e, { level: 'error', tags: { flow: 'refund.buyer.cancel' } });
      appAlert('Hata', e?.response?.data?.message || 'İşlem başarısız. Tekrar deneyin.');
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await query.refetch();
    setRefreshing(false);
  }, [query]);

  useFocusEffect(
    useCallback(() => {
      query.refetch();
      // Yalnız odaklanmada tazele; `query` her render'da yeni referans.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab]),
  );

  return {
    isAuthenticated,
    tab,
    setTab,
    refunds: query.data ?? [],
    isLoading: query.isLoading,
    refreshing,
    onRefresh,
    cancelMutation,
  };
}

export type RefundRequestsController = ReturnType<typeof useRefundRequests>;
