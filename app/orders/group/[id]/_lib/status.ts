import i18n from '@/i18n/config';
import type { BadgeVariant } from '@/ui';
import type { GroupOrder } from './types';

// Durum haritası TEK kaynakta (`@/lib/shared/orderStatus`); burada yeniden
// tanımlamak üç rotanın sessizce ayrışmasına yol açıyordu.
export { uiOrderStatusMeta, useOrderStatusConfig, useStatusText } from '@/lib/shared/orderStatus';

// Rozet önceliği (liste/detay ile aynı): aktif iade > iptal > normal durum.
// İade tamamlandıysa (status 'refunded') "İade Edildi", aksi halde "İade Sürecinde".
export const badgeStatusOf = (o: {
  status: string;
  cancellationType?: 'iptal' | 'iade' | null;
  activeRefundRequest?: { id: string; status: string } | null;
}): string => {
  if (o.activeRefundRequest) {
    return o.activeRefundRequest.status === 'refunded' ? 'refunded' : 'refund_requested';
  }
  if (o.cancellationType === 'iptal') return 'cancelled';
  return o.status;
};

export const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

/** Bir ürün satırının türetilmiş görünüm bayrakları (kargo/iptal/iade gösterimi). */
export function deriveOrderRow(order: GroupOrder) {
  const tracking = order.trackingNumber || order.shipment?.trackingNumber;
  // Kargo öncesi = İptal, kargo sonrası = İade. apiStatusToUi paid/preparing'i
  // 'processing'e indirir; 'pending' ödeme bekleyen sipariştir.
  const isPreShipment = ['pending', 'processing'].includes(order.status);
  const isCancelled = order.status === 'cancelled' || order.cancellationType === 'iptal';
  const isClosed = isCancelled || order.status === 'refunded';
  const isDelivered = ['delivered', 'awaiting_confirmation', 'completed'].includes(order.status);
  const showTracking =
    !!tracking &&
    !isCancelled &&
    order.status !== 'refunded' &&
    ['shipped', 'delivered', 'awaiting_confirmation', 'completed'].includes(order.status);
  // Saf modül — global i18next örneği (hook yok).
  const actionLabel = isClosed
    ? null
    : isPreShipment
      ? i18n.t('order.cancellationActions')
      : i18n.t('order.refundActions');
  return { tracking, isPreShipment, isCancelled, isClosed, isDelivered, showTracking, actionLabel };
}
