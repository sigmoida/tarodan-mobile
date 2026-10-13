// order'dan türetilen tüm görünüm değerleri — tek saf fonksiyon.
import { REFUND_STATUS_META } from './status';
import i18n from '@/i18n/config';
import type { PublicTimingPolicy } from '@/lib/api/timingRules';
import { preparingDeadlineNoticeOf, type PreparingDeadlineAudience } from '@/lib/shared/preparingDeadline';
import { isMembershipOrder as isMembership } from '@/lib/shared/membershipOrder';
import { computePayoutDate, isPastRefundWindow, orderTimingValues } from './timing';
import type { OrderDetail } from './types';

/**
 * `policy`: `GET /timing-rules` (yüklenene kadar varsayılanlar). İade penceresi
 * ve satıcı ödeme tarihi önce sunucu damgasından okunur (bkz. `./timing`).
 * `audience`: görüntüleyen (ekran `user.id`'den hesaplar) — hazırlık notu metni.
 *
 * `timing`: kartların `t()` çağrılarına geçtiği ICU parametreleri — kartlar
 * kendi `useTimingValues`'ını çağırmaz, değer tek yerden (buradan) gelir. Gün
 * sayıları siparişin kendi damgalarından (bkz. `orderTimingValues`).
 */
export function deriveOrderView(
  order: OrderDetail,
  policy: PublicTimingPolicy,
  audience: PreparingDeadlineAudience = 'buyer',
) {
  const isMembershipOrder = isMembership(order);

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

  const payoutReleaseDate = computePayoutDate(order, policy);
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

  const pastRefundWindow = isPastRefundWindow(order, policy);
  const preparingNotice = preparingDeadlineNoticeOf(order, audience);
  const timing = orderTimingValues(order, policy);

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
    isPastRefundWindow: pastRefundWindow,
    preparingNotice,
    timing,
  };
}

export type OrderView = ReturnType<typeof deriveOrderView>;
