// Every view value derived from the order: one pure function.
import { REFUND_STATUS_META } from './status';
import i18n from '@/i18n/config';
import type { PublicTimingPolicy } from '@/lib/api/timingRules';
import { preparingDeadlineNoticeOf } from '@/lib/shared/preparingDeadline';
import { isDigitalOrder } from '@/types';
import { computePayoutDate, isPastRefundWindow, orderTimingValues, returnWindowEnd } from './timing';
import type { OrderDetail } from './types';

/**
 * `policy`: `GET /timing-rules` (yüklenene kadar varsayılanlar). İade penceresi
 * ve satıcı ödeme tarihi önce sunucu damgasından okunur (bkz. `./timing`).
 * Hazırlık notunun okuyucusu siparişin `isSeller`/`isBuyer` bayraklarından.
 * `now`: ekranın `useDeadlineNow`'ı — son tarih geçince not kalkar.
 *
 * `timing`: kartların `t()` çağrılarına geçtiği ICU parametreleri — kartlar
 * kendi `useTimingValues`'ını çağırmaz, değer tek yerden (buradan) gelir. Gün
 * sayıları siparişin kendi damgalarından (bkz. `orderTimingValues`).
 */
export function deriveOrderView(
  order: OrderDetail,
  policy: PublicTimingPolicy,
  now: Date = new Date(),
) {
  // A digital order (membership, boost) sells a platform service, not goods: no shipping,
  // tracking, escrow, cancel, refund request, rating or preparing note (contract delta
  // 2026-10-23-order-kind). Every card reads this one flag.
  const digital = isDigitalOrder(order);

  const canRate = !digital && ['delivered', 'completed'].includes(order.status);

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

  // İade penceresinin sonu ile satıcı ödeme tarihi AYRI tarihlerdir (arada
  // payout grace var); escrow kartı ikisini ayrı gösterir.
  const refundWindowEnd = returnWindowEnd(order, policy);
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
  const preparingNotice = preparingDeadlineNoticeOf(order, now);
  const timing = orderTimingValues(order, policy);

  return {
    isDigitalOrder: digital,
    canRate,
    isPreShipment,
    isPostShipment,
    isCancelled,
    isDelivered,
    showTrackingCard,
    isPaid,
    refundWindowEnd,
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
