import { useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/query';

/** Sipariş detayı + listeler — her sipariş mutasyonunun ortak invalidation seti (tek kaynak). */
export function useInvalidateOrder(id: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: qk.orders.detail(id) });
    queryClient.invalidateQueries({ queryKey: qk.orders.all });
  };
}
