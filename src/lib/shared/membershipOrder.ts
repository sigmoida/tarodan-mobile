/**
 * Üyelik/dijital sipariş mi? (sanal ürün + platform satıcısı, "MEM-" sipariş no)
 * Web `orders/[id]/_lib/types.ts` → `isMembershipOrder` aynası. Bu siparişler
 * fiziksel ürün gibi davranmaz: iade/kargo/hazırlık notu/escrow gösterilmez.
 *
 * TEK kaynak: sipariş detayı (`deriveOrderView`) ve hazırlık notu
 * (`preparingDeadlineNoticeOf`) aynı kuralı buradan okur.
 */
export interface MembershipCheckOrder {
  isMembership?: boolean | null;
  orderNumber?: string | null;
}

export function isMembershipOrder(order: MembershipCheckOrder): boolean {
  return !!(order.isMembership ?? order.orderNumber?.startsWith('MEM-') ?? false);
}
