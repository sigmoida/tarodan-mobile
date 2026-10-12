// order'dan türetilen tüm görünüm değerleri — tek saf fonksiyon.
import { COOLING_OFF_DAYS, REFUND_STATUS_META } from './status';
import i18n from '@/i18n/config';
import type { OrderDetail } from './types';
import type { RefundPhase } from './schema';

/** Teslimden bu yana cayma süresi geçti mi (teslim tarihi yoksa hayır). */
function isPastRefundWindowOf(order: OrderDetail): boolean {
  if (!order.deliveredAt) return false;
  const d = new Date(order.deliveredAt);
  if (Number.isNaN(d.getTime())) return false;
  const ageDays = (Date.now() - d.getTime()) / (1000 * 3600 * 24);
  return ageDays > COOLING_OFF_DAYS;
}

/**
 * İade talebinin fazı — web `inferRefundPhase` ile aynı kural: ödenmiş/hazırlanan
 * ve kargosu henüz yola çıkmamış sipariş `preparing`, cayma süresi geçmişse
 * `past_cooling_off`, aksi halde `in_cooling_off`. (Mobil `status` UI'ya
 * normalize: `processing` = API `paid`/`preparing`.)
 */
export function refundPhaseOf(order: OrderDetail): RefundPhase {
  const shipmentStatus = order.shipment?.status;
  if (order.status === 'processing' && (!shipmentStatus || shipmentStatus === 'pending')) {
    return 'preparing';
  }
  return isPastRefundWindowOf(order) ? 'past_cooling_off' : 'in_cooling_off';
}

export function deriveOrderView(order: OrderDetail) {
  const isMembershipOrder = !!(order.isMembership ?? order.orderNumber?.startsWith('MEM-') ?? false);

  const canRate = !isMembershipOrder && ['delivered', 'completed'].includes(order.status);

  const isPreShipment = ['pending', 'processing'].includes(order.status);
  const isPostShipment = ['shipped', 'delivered', 'awaiting_confirmation', 'completed'].includes(
    order.status,
  );
  const isCancelled = order.status === 'cancelled' || order.cancellationType === 'iptal';
  const isDelivered = ['delivered', 'awaiting_confirmation', 'completed'].includes(order.status);

  // Kod/referans varlığı kartın kendi kapısı (bkz. OrderTrackingCard); burada
  // yalnızca sipariş durumuna göre gösterime uygunluk türetilir.
  const showTrackingCard =
    !!order.shippedAt &&
    isPostShipment &&
    !isCancelled &&
    order.status !== 'refunded';

  const isPaid =
    !!order.paidAt ||
    order.payment?.status === 'completed' ||
    ['processing', 'shipped', 'delivered', 'awaiting_confirmation', 'completed'].includes(order.status);

  const payoutReleaseDate = (() => {
    if (!order.deliveredAt) return null;
    const d = new Date(order.deliveredAt);
    d.setDate(d.getDate() + COOLING_OFF_DAYS);
    return d;
  })();
  const hasActiveRefund = !!order.activeRefundRequest;

  const isRefundedOrder = order.status === 'refunded' || hasActiveRefund;
  const showRefundCancelStep = isCancelled || isRefundedOrder;
  const refundCancelLabel: string = isCancelled
    ? i18n.t('common.cancelled')
    : order.activeRefundRequest
      ? (() => {
          const meta = REFUND_STATUS_META[order.activeRefundRequest!.status];
          return meta ? i18n.t(meta.labelKey) : i18n.t('order.refundInProgress');
        })()
      : i18n.t('order.statusRefunded');
  const refundCancelDate: string | undefined = isCancelled
    ? order.cancelledAt ?? undefined
    : order.activeRefundRequest?.refundedAt ??
      order.activeRefundRequest?.createdAt ??
      order.cancelledAt ??
      undefined;

  const isPastRefundWindow = isPastRefundWindowOf(order);

  return {
    isMembershipOrder,
    canRate,
    isPreShipment,
    isPostShipment,
    isCancelled,
    isDelivered,
    showTrackingCard,
    isPaid,
    payoutReleaseDate,
    hasActiveRefund,
    isRefundedOrder,
    showRefundCancelStep,
    refundCancelLabel,
    refundCancelDate,
    isPastRefundWindow,
  };
}

export type OrderView = ReturnType<typeof deriveOrderView>;
