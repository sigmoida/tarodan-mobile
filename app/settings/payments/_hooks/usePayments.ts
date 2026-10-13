import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { appAlert } from '@/ui';
import { useAuthStore } from '@/stores/authStore';
import { paymentsApi } from '@/lib/api';
import { useRequireLegalIdentity } from '@/hooks/useLegalIdentity';
import type { Payment } from '../_lib/types';

/**
 * Payments-history controller — owns the GET /payments/me query + status filter,
 * the cancel (pending) and retry (failed → paymentUrl webview) handlers, and the
 * snackbar. Lifted verbatim from the monolithic screen (§12).
 */
export function usePayments() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const { requireIdentity, isChecking: checkingIdentity } = useRequireLegalIdentity();
  /** Kimliği kontrol edilen yeniden deneme (kartında yükleniyor gösterilir). */
  const [retryTargetId, setRetryTargetId] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ visible: boolean; message: string }>({
    visible: false,
    message: '',
  });

  const paymentsQuery = useQuery({
    queryKey: ['my-payments', statusFilter],
    queryFn: async () => {
      const params: any = { page: 1, limit: 50 };
      if (statusFilter) params.status = statusFilter;
      const response = await paymentsApi.getMyPayments(params);
      const data: any = response.data;
      const list: Payment[] = data?.payments ?? data?.data ?? data ?? [];
      return Array.isArray(list) ? list : [];
    },
    enabled: isAuthenticated,
  });

  const handleCancel = (id: string) => {
    appAlert(t('payment.cancelTitle'), t('payment.cancelConfirm'), [
      { text: t('discount.discard'), style: 'cancel' },
      {
        text: t('payment.cancelAction'),
        style: 'destructive',
        onPress: async () => {
          try {
            await paymentsApi.cancel(id);
            setSnackbar({ visible: true, message: t('payment.cancelled') });
            queryClient.invalidateQueries({ queryKey: ['my-payments'] });
          } catch (e: any) {
            appAlert(t('common.error'), e?.response?.data?.message || t('payment.cancelFailed'));
          }
        },
      },
    ]);
  };

  const handleRetry = async (id: string) => {
    // B4: yeniden deneme yeni bir ödeme başlatır — önce yasal kimlik. Kapı onay
    // penceresinden ÖNCE (`appAlert` kapanırken native kapı açılırsa iOS donar).
    setRetryTargetId(id);
    if (!(await requireIdentity())) return;
    appAlert(t('payment.retryTitle'), t('payment.retryConfirm'), [
      { text: t('discount.discard'), style: 'cancel' },
      {
        text: t('common.continueShort'),
        onPress: async () => {
          try {
            const response: any = await paymentsApi.retry(id);
            const url = response?.data?.paymentUrl ?? response?.data?.data?.paymentUrl;
            if (url) {
              router.push({ pathname: '/payment/[id]', params: { id, paymentUrl: url } } as any);
            } else {
              setSnackbar({ visible: true, message: t('payment.retryStarted') });
              queryClient.invalidateQueries({ queryKey: ['my-payments'] });
            }
          } catch (e: any) {
            appAlert(t('common.error'), e?.response?.data?.message || t('payment.retryFailed'));
          }
        },
      },
    ]);
  };

  return {
    isAuthenticated,
    paymentsQuery,
    payments: paymentsQuery.data ?? [],
    statusFilter,
    setStatusFilter,
    snackbar,
    setSnackbar,
    handleCancel,
    handleRetry,
    /** Kimliği kontrol edilen ödeme; o kartın "Tekrar Dene"si yükleniyor, hepsi devre dışı. */
    retryCheckingId: checkingIdentity ? retryTargetId : null,
  };
}

export type PaymentsController = ReturnType<typeof usePayments>;
