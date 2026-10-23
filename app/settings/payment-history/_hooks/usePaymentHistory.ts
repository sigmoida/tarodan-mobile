import { useQuery } from '@tanstack/react-query';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { qk } from '@/lib/query';
import { useAuthStore } from '@/stores/authStore';
import { useRefresh } from '@/hooks/useRefresh';
import { useRefetchStaleOnFocus } from '@/hooks/useRefetchStaleOnFocus';
import { paymentsApi } from '@/lib/api';
import type { Payment, PaymentHistoryApiItem, PaymentHistoryResponse } from '../_lib/types';

function listOf(raw: PaymentHistoryResponse): PaymentHistoryApiItem[] {
  if (Array.isArray(raw)) return raw;
  return raw?.payments ?? raw?.data ?? [];
}

/** API row -> screen model. The provider is never shown (no fallback to it for the method). */
function toPayment(p: PaymentHistoryApiItem, t: TFunction): Payment {
  return {
    id: p.id,
    amount: Number(p.amount) || 0,
    status: p.status,
    method: p.method || undefined,
    description:
      p.description ||
      p.product?.title ||
      (p.orderNumber ? t('payment.orderNumberFallback', { id: p.orderNumber }) : t('checkout.title')),
    createdAt: p.createdAt,
    imageUrl: p.product?.images?.[0] || undefined,
  };
}

/**
 * Payment history controller: `GET /payments/me`, refetch on focus when stale and
 * pull-to-refresh. The details open inline in the row (Accordion), so there is no dialog here.
 *
 * Moved to React Query (src/lib/query/CLAUDE.md › Query hooks): the response is mapped to the
 * screen model here, while cache and loading/refresh states come from the query itself.
 */
export function usePaymentHistory() {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const query = useQuery({
    queryKey: qk.payments.history,
    enabled: isAuthenticated,
    queryFn: async (): Promise<Payment[]> => {
      // Same source as web: GET /payments/me.
      const res = await paymentsApi.getMyPayments({ limit: 50 });
      return listOf(res.data as PaymentHistoryResponse).map((p) => toPayment(p, t));
    },
  });

  // Back on the screen, refetch only when stale (it used to invalidate on every focus).
  useRefetchStaleOnFocus([qk.payments.history], isAuthenticated);

  // The pull-to-refresh spinner only when the USER pulls; `isRefetching` is also true on
  // background refetches and spun the indicator by itself.
  const { refreshing, onRefresh } = useRefresh(query.refetch);

  return {
    isAuthenticated,
    payments: query.data ?? [],
    isLoading: query.isLoading,
    /** History could not be loaded (and none is cached): not "no history", ErrorState + retry. */
    loadFailed: query.isError && !query.data,
    isRefreshing: refreshing,
    fetchPayments: onRefresh,
  };
}

export type PaymentHistoryController = ReturnType<typeof usePaymentHistory>;
