import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/query';
import { appAlert } from '@/ui';
import { useAuthStore } from '@/stores/authStore';
import { paymentsApi } from '@/lib/api';
import type { Payment } from '../_lib/types';
import { STATUS_CONFIG, formatDate, formatCurrency } from '../_lib/status';

/**
 * Ödeme geçmişi controller'ı — `GET /payments/me`, odakta tazeleme, çekerek
 * yenileme ve detay uyarısı.
 *
 * React Query'ye taşındı (CLAUDE.md §6): sunucu yanıtı ekran modeline burada
 * çevriliyor, ama önbellek ve yükleme/yenileme durumları artık sorgunun
 * kendisinden geliyor — elle üç ayrı `useState` tutulmuyor.
 */
export function usePaymentHistory() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: qk.payments.mine,
    enabled: isAuthenticated,
    queryFn: async (): Promise<Payment[]> => {
      // Web ile aynı kaynak: GET /payments/me. Yanıt alanları (orderNumber,
      // product, provider) ekran modeline (description, method) burada çevrilir.
      const res = await paymentsApi.getMyPayments({ limit: 50 });
      const raw: any = res.data;
      const items: any[] = raw?.payments || raw?.data || (Array.isArray(raw) ? raw : []);
      return items.map((p: any) => ({
        id: p.id,
        amount: Number(p.amount) || 0,
        status: p.status,
        method: p.method || (p.provider ? String(p.provider).toUpperCase() : ''),
        description:
          p.description || p.product?.title || (p.orderNumber ? `Sipariş #${p.orderNumber}` : 'Ödeme'),
        createdAt: p.createdAt,
        invoiceUrl: p.invoiceUrl,
        imageUrl: p.product?.images?.[0] || undefined,
      }));
    },
  });

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) queryClient.invalidateQueries({ queryKey: qk.payments.mine });
    }, [isAuthenticated, queryClient]),
  );

  const handlePaymentPress = (payment: Payment) => {
    appAlert(
      'Ödeme Detayı',
      [
        `Tutar: ${formatCurrency(payment.amount)}`,
        `Tarih: ${formatDate(payment.createdAt)}`,
        `Durum: ${STATUS_CONFIG[payment.status]?.label || payment.status}`,
        `Yöntem: ${payment.method || '-'}`,
        payment.description ? `Açıklama: ${payment.description}` : null,
      ]
        .filter(Boolean)
        .join('\n'),
      [{ text: 'Tamam' }],
    );
  };

  return {
    isAuthenticated,
    payments: query.data ?? [],
    isLoading: query.isLoading,
    isRefreshing: query.isRefetching,
    fetchPayments: () => query.refetch(),
    handlePaymentPress,
  };
}

export type PaymentHistoryController = ReturnType<typeof usePaymentHistory>;
