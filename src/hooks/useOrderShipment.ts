import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { shippingApi, type Shipment } from '@/lib/api';
import { qk, retryUnlessClientError } from '@/lib/query';
import { unwrapEnvelope } from '@/utils/apiEnvelope';

/**
 * Siparişin kargo kaydı. Hem alıcı sipariş detayı hem satıcı kargo ekranı
 * kullanıyor, o yüzden rota-yerel değil paylaşılan hook.
 *
 * **404 hata DEĞİL:** her siparişin kargo kaydı yok. Uç
 * `404 "Bu sipariş için kargo bulunamadı"` döndürüyor; bunu `null`'a çeviriyoruz
 * ki satıcıya olmayan bir sorun gösterilmesin ve onarım yolu açık kalsın.
 */
export function useOrderShipment(orderId: string | undefined) {
  const query = useQuery({
    queryKey: qk.shipping.byOrder(orderId ?? ''),
    queryFn: async () => {
      try {
        const res = await shippingApi.getOrderShipments(orderId!);
        return unwrapEnvelope<Shipment>(res) ?? null;
      } catch (error: any) {
        if (error?.response?.status === 404) return null;
        throw error;
      }
    },
    enabled: Boolean(orderId),
    staleTime: 30_000,
    retry: retryUnlessClientError,
  });
  // Ekran odağa geldiğinde tazele. `isCodePending` NORMAL bir ara durum ve kod
  // birkaç dakika içinde geliyor — zamanlayıcıyla poll etmek pil yakar ve
  // hiçbir şeyi hızlandırmaz. Kalıp `app/orders/_hooks/useOrders.ts:105`.
  useFocusEffect(
    useCallback(() => {
      if (orderId) void query.refetch();
      // `query.refetch` referansı sorgu başına stabil; bağımlılığa orderId yeter.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orderId]),
  );

  return {
    shipment: query.data ?? null,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
