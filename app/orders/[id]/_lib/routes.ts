import { router } from 'expo-router';
import type { ReviewType } from './reviewSchema';

/**
 * Sipariş form ekranlarına geçiş — TEK kaynak (liste ve detay aynı rotaları iter).
 * Eskiden bunlar ekranın üstünde açılan modallardı (iade, puanlama).
 */
export function openRefundRequest(orderId: string) {
  router.push({ pathname: '/orders/[id]/refund', params: { id: orderId } } as never);
}

export function openOrderReview(orderId: string, type: ReviewType) {
  router.push({ pathname: '/orders/[id]/review', params: { id: orderId, type } } as never);
}
