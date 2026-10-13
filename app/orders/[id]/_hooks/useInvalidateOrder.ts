import { useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/query';

/**
 * Sipariş detayı + listeler + e-Arşiv belgeleri — her sipariş mutasyonunun
 * (iade talebi, iade iptali, sipariş iptali) ortak invalidation seti (tek
 * kaynak). İade/iptal yeni belge (iade belgesi) doğurabildiği için e-Arşiv
 * listesi de tazelenir.
 */
export function useInvalidateOrder(id: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: qk.orders.detail(id) });
    queryClient.invalidateQueries({ queryKey: qk.orders.all });
    queryClient.invalidateQueries({ queryKey: qk.orders.elogoInvoices(id) });
  };
}
