import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import i18n from '@/i18n/config';
import { refundsApi } from '@/lib/api';
import { qk, useAppMutation } from '@/lib/query';
import { captureException } from '@/services/sentry';
import { useAuthStore } from '@/stores/authStore';
import { FOCUS_LIST_STALE_MS, useRefetchStaleOnFocus } from '@/hooks/useRefetchStaleOnFocus';
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
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<RefundTab>('buyer');

  // Anahtar sorgu ile odak tazelemesi arasında tek yerde.
  const listKey = qk.refunds.list(tab);
  const query = useQuery({
    queryKey: listKey,
    queryFn: async () => {
      const res = await (tab === 'seller' ? refundsApi.getSeller() : refundsApi.getMine());
      return readList<RefundRequestRow>(res);
    },
    enabled: isAuthenticated,
    // Talep durumu karşı taraftan değişir: dönüşte bundan eskiyse tazelenir.
    staleTime: FOCUS_LIST_STALE_MS,
  });

  const cancelMutation = useAppMutation((id: string) => refundsApi.cancel(id), {
    invalidates: [qk.refunds.all],
    success: i18n.t('refund.cancelSuccessBody'),
    error: i18n.t('refund.cancelFailed'),
    onError: (e) => captureException(e, { level: 'error', tags: { flow: 'refund.buyer.cancel' } }),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await query.refetch();
    setRefreshing(false);
  }, [query]);

  // Ekrana dönüşte yalnız bayatsa tazele (her odakta değil; ilk açılışta ikinci istek yok).
  useRefetchStaleOnFocus([listKey], isAuthenticated);

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
