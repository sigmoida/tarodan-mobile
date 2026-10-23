import i18n from '@/i18n/config';
import { deriveShipmentView } from '@/lib/shipping/tracking';
import { isAwaitingDropoff } from '@/lib/shipping/shipmentStatus';
import { isDigitalOrder } from '@/types';
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

/**
 * UI statuses before the carrier handover (`apiStatusToUi` folds the server's `paid` and
 * `preparing` into `processing`, so the rule is written in UI names): `pending` (awaiting
 * payment) and `processing`.
 */
const CANCELLABLE_UI_STATUSES: ReadonlyArray<GroupOrder['status']> = ['pending', 'processing'];

/**
 * Whether the whole group can be cancelled (web `isGroupCancellable`). The server refuses once a
 * single line has been handed to the carrier, so offering the button would walk the user into
 * that error. A line that is cancelled, has an active refund request or is a digital order
 * (membership, boost: never cancelled from here) closes the group cancel.
 */
export function isGroupCancellable(orders: readonly GroupOrder[]): boolean {
  return (
    orders.length > 0 &&
    orders.every(
      (o) =>
        !isDigitalOrder(o) &&
        o.cancellationType !== 'iptal' &&
        !o.activeRefundRequest &&
        CANCELLABLE_UI_STATUSES.includes(o.status),
    )
  );
}

/**
 * Derived view flags of one line (shipping, cancel, refund). A digital order (membership, boost)
 * ships nothing and has no cancel or refund action, so its line shows neither.
 */
export function deriveOrderRow(order: GroupOrder) {
  const digital = isDigitalOrder(order);
  // ALICI EKRANI: `trackingNumber` (`PKG-…`) Tarodan iç referansı — satıcının
  // şubede vereceği numara, Sürat onu TANIMAZ. Alıcının takip edebileceği tek
  // numara `cargoCode`; yoksa numara YERİNE bekleme metni gösterilir.
  const { cargoCode } = deriveShipmentView(
    order.shipment,
    order.cargoCode ?? order.shipment?.cargoCode,
  );
  // Kargo öncesi = İptal, kargo sonrası = İade. apiStatusToUi paid/preparing'i
  // 'processing'e indirir; 'pending' ödeme bekleyen sipariştir.
  const isPreShipment = ['pending', 'processing'].includes(order.status);
  const isCancelled = order.status === 'cancelled' || order.cancellationType === 'iptal';
  const isClosed = isCancelled || order.status === 'refunded';
  const isDelivered = ['delivered', 'awaiting_confirmation', 'completed'].includes(order.status);
  const showTracking =
    !digital &&
    !isCancelled &&
    order.status !== 'refunded' &&
    ['shipped', 'delivered', 'awaiting_confirmation', 'completed'].includes(order.status);
  // Saf modül — global i18next örneği (hook yok). JSX yeniden türetmesin diye
  // satırın metni de burada kurulur (§ "türetmeler saf birimlerde").
  const statusLabel = isDelivered ? i18n.t('order.statusDelivered') : i18n.t('order.trackOrder');
  // "Satıcı hazırlıyor" YALNIZ paket hâlâ satıcıdayken doğru. Kapı kargo
  // durumundan okunur (tek kaynak: `@/lib/shipping/shipmentStatus`); durum
  // gelmediyse sipariş teslim edilmiş mi ona bakılır — kod hiç gelmediği için
  // bu dal her gönderide çalışıyor ve yanlış kapı doğrudan yanıltıyordu.
  const awaitingDropoff = !isDelivered && isAwaitingDropoff(order.shipment?.status);
  const trackingText = cargoCode
    ? `${statusLabel}: ${cargoCode}`
    : awaitingDropoff
      ? i18n.t('order.shipmentPreparingBuyer')
      : statusLabel;
  const actionLabel = isClosed || digital
    ? null
    : isPreShipment
      ? i18n.t('order.cancellationActions')
      : i18n.t('order.refundActions');
  return {
    cargoCode,
    trackingText,
    isPreShipment,
    isCancelled,
    isClosed,
    isDelivered,
    showTracking,
    actionLabel,
  };
}
