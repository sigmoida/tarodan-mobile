import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { isNotFoundError, qk } from '@/lib/query';
import { apiStatusToUi } from '@/utils/orderStatus';
import type { OrderDetail } from '../_lib/types';

/** GET /orders/:id — status UI'ya normalize edilir, adet items[0]'a düşer. */
export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: qk.orders.detail(String(id)),
    enabled: !!id,
    queryFn: async (): Promise<OrderDetail | null> => {
      try {
        const response = await api.get(`/orders/${id}`);
        const data = response.data?.data ?? response.data;
        if (!data) return null;
        return {
          ...data,
          status: apiStatusToUi(data.status),
          quantity: data.quantity ?? data.items?.[0]?.quantity ?? 1,
          product: { ...(data.product || {}), imageUrl: data.product?.imageUrl },
        };
      } catch (error) {
        // Yalnız gerçek 404 "bulunamadı" (null); ağ/5xx FIRLATILIR → ekran ErrorState + yeniden dene.
        if (isNotFoundError(error)) return null;
        throw error;
      }
    },
  });
}
