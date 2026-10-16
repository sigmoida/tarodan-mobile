import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { appAlert } from '@/ui';
import { useAuthStore } from '@/stores/authStore';
import { useRefresh } from '@/hooks/useRefresh';
import { paymentsApi } from '@/lib/api';
import { qk, useAppMutation } from '@/lib/query';
import type { Payment } from '../_lib/types';
import { useDoRetryPayment } from './useDoRetryPayment';

/**
 * Payments-history controller — owns the GET /payments/me query + status filter,
 * the cancel (pending) handler (info → toast); retry (failed → kimlik → onay →
 * paymentUrl webview) lives in `useDoRetryPayment`. Lifted from the monolithic
 * screen (§12).
 */
export function usePayments() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuthStore();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const retry = useDoRetryPayment();

  const paymentsQuery = useQuery({
    queryKey: qk.payments.list(statusFilter),
    queryFn: async () => {
      const params: any = { page: 1, limit: 50 };
      if (statusFilter) params.status = statusFilter;
      const response = await paymentsApi.getMyPayments(params);
      const data: any = response.data;
      const list: Payment[] = data?.payments ?? data?.data ?? data ?? [];
      return Array.isArray(list) ? list : [];
    },
    enabled: isAuthenticated,
    // Filtre değişince eski liste kalır; isLoading yalnız ilk yüklemede true olur,
    // böylece PageShell çipleri unmount etmez.
    placeholderData: keepPreviousData,
  });

  const cancelMutation = useAppMutation((id: string) => paymentsApi.cancel(id), {
    invalidates: [qk.payments.mine],
    success: t('payment.cancelled'),
    error: t('payment.cancelFailed'),
  });

  const handleCancel = (id: string) => {
    appAlert(t('payment.cancelTitle'), t('payment.cancelConfirm'), [
      { text: t('discount.discard'), style: 'cancel' },
      {
        text: t('payment.cancelAction'),
        style: 'destructive',
        onPress: () => cancelMutation.mutate(id),
      },
    ]);
  };

  // Çekip-yenile göstergesi yalnız kullanıcı çektiğinde: `isFetching` filtre çipi değişiminde
  // (keepPreviousData) ve iptal/yeniden deneme sonrası invalidate'te de dönüyordu.
  const { refreshing, onRefresh } = useRefresh(paymentsQuery.refetch);

  return {
    isAuthenticated,
    paymentsQuery,
    refreshing,
    onRefresh,
    payments: paymentsQuery.data ?? [],
    statusFilter,
    setStatusFilter,
    handleCancel,
    handleRetry: retry.start,
    /** Kimlik kontrolü ya da retry sürüyor → TÜM "Tekrar Dene" düğmeleri devre dışı. */
    retryBusy: retry.busy,
    /** Spinner'ın gösterileceği kart (`mutation.variables`'tan). */
    retryPendingId: retry.pendingId,
  };
}

export type PaymentsController = ReturnType<typeof usePayments>;
