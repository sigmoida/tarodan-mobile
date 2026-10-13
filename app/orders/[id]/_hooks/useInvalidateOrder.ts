import { useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/query';

/**
 * Sipariş detayı + listeler + e-Arşiv belgeleri — her sipariş mutasyonunun
 * (iade talebi, iade iptali, sipariş iptali) ortak invalidation seti (tek
 * kaynak). İade/iptal yeni belge (iade belgesi) doğurabildiği için e-Arşiv
 * listesi de tazelenir. `useAppMutation({ invalidates })` doğrudan bunu alır.
 */
export const orderInvalidationKeys = (id: string) =>
  [qk.orders.detail(id), qk.orders.all, qk.orders.elogoInvoices(id)] as const;

export function useInvalidateOrder(id: string) {
  const queryClient = useQueryClient();
  return () => {
    for (const queryKey of orderInvalidationKeys(id)) {
      queryClient.invalidateQueries({ queryKey });
    }
  };
}
