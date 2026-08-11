import i18n from '@/i18n/config';
import { deriveShipmentView } from '@/lib/shipping/tracking';
import { isAwaitingDropoff } from '@/lib/shipping/shipmentStatus';
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
  const actionLabel = isClosed
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
