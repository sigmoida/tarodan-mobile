import type { TFunction } from 'i18next';
import { theme } from '@/ui';
import type { MessageKey } from '@/i18n/lib';

const { colors } = theme;

export interface OrderStatus {
  id: string;
  orderNumber: string;
  /** Grup numarası (`GRP-…`) — çok satıcılı siparişte gelir, eski kayıtlarda null. */
  groupNumber?: string | null;
  /** Teslimat/paket numarası (`PKG-…`) — kargo oluşunca gelir, eski kayıtlarda null. */
  packageNumber?: string | null;
  status: string;
  totalAmount: number;
  createdAt: string;
  product: {
    title: string;
    images: string[];
  };
  /**
   * `POST /orders/guest/track` kargo özeti. DİKKAT: uç yalnız
   * `trackingNumber`'ı gönderiyor ve o Tarodan İÇ REFERANSI (`PKG-…`) —
   * satıcının şubede vereceği numara. Sürat onu TANIMAZ, alıcıya
   * GÖSTERİLMEZ. Gerçek Sürat kodu (`providerTrackingId`/`cargoCode`) bu
   * yanıtta HİÇ YOK; uç eklenene kadar bu ekran kod gösteremez.
   */
  shipment?: {
    trackingNumber: string;
    provider: string;
    status: string;
    estimatedDelivery?: string;
  };
}

// Etiketler sabit metin DEĞİL, katalog anahtarıdır — modül saf olduğu için
// `useTranslation` çağıramaz; çeviri `getStatusInfo`/`getClosedTrackHint`'e
// verilen `t` ile render anında yapılır. NOT: 'paid' burada bilerek buyer
// orders/[id]'in `order.statusPaid` ("Ödendi") yerine `order.statusPaidReceived`
// ("Ödeme Alındı") kullanır — misafir takip ekranı zaten bu farklı kelimeyle
// yayındaydı; bkz. i18n raporundaki durum-etiketi anlaşmazlıkları listesi.
export const STATUS_META: Record<string, { labelKey: MessageKey; color: string; icon: string }> = {
  pending_payment: { labelKey: 'order.statusPendingPayment', color: colors.warning[500]!, icon: 'time-outline' },
  paid: { labelKey: 'order.statusPaidReceived', color: colors.success[600]!, icon: 'checkmark-circle-outline' },
  preparing: { labelKey: 'order.statusProcessing', color: colors.info[600]!, icon: 'construct-outline' },
  shipped: { labelKey: 'order.statusShipped', color: colors.info[700]!, icon: 'car-outline' },
  delivered: { labelKey: 'order.statusDelivered', color: colors.success[600]!, icon: 'checkmark-done-outline' },
  completed: { labelKey: 'order.statusCompleted', color: colors.success[600]!, icon: 'trophy-outline' },
  cancelled: { labelKey: 'order.statusCancelled', color: colors.danger[600]!, icon: 'close-circle-outline' },
  refunded: { labelKey: 'order.statusRefunded', color: colors.warning[600]!, icon: 'return-down-back-outline' },
  refund_requested: { labelKey: 'order.statusRefundInProgress', color: colors.danger[600]!, icon: 'return-down-back-outline' },
};

// Terminal/kapalı durumlar: mutlu-yol (Oluşturuldu→Ödeme→Kargo→Teslim) zaman
// çizelgesi yanıltıcı olur; bunun yerine net bir son-durum bloğu gösterilir.
export const CLOSED_TRACK_STATUSES = ['cancelled', 'refunded', 'refund_requested'];
export const CLOSED_TRACK_HINT_KEYS: Record<string, MessageKey> = {
  cancelled: 'order.trackClosedHintCancelled',
  refunded: 'order.trackClosedHintRefunded',
  refund_requested: 'order.trackClosedHintRefundRequested',
};

/**
 * Misafirin İPTAL edebileceği durumlar — kargoya devirden ÖNCEsi.
 *
 * Sunucu (`OrderLifecycleService.cancel`) kargoya verilmiş siparişte
 * `server.order.cancelAfterHandover` ile 400 atıyor; burası o kuralın ekrandaki
 * karşılığı. `paid`/`preparing`'de ayrıca `reasonCode` ZORUNLU — form bunu her
 * zaman gönderiyor (bkz. `@/lib/shared/orderCancellation`).
 *
 * `shipped` ve sonrası bilerek DIŞARIDA: butonu göstermek yalnız kullanıcıyı
 * sunucudan gelecek bir 400'e yürütür.
 */
export const GUEST_CANCELLABLE_STATUSES = ['pending_payment', 'paid', 'preparing'];

/** Kargoya verilmemiş, hâlâ iptal edilebilir bir sipariş mi? */
export function canGuestCancel(order: OrderStatus | null | undefined): boolean {
  if (!order) return false;
  // Kargo kaydı doğmuşsa (etiket/teslim alma) sunucu zaten reddeder.
  if (order.shipment && order.shipment.status !== 'pending') return false;
  return GUEST_CANCELLABLE_STATUSES.includes(order.status);
}

export const getStatusInfo = (status: string, t: TFunction) => {
  const meta = STATUS_META[status];
  return meta
    ? { label: t(meta.labelKey), color: meta.color, icon: meta.icon }
    : { label: status, color: colors.gray[500]!, icon: 'help-circle-outline' };
};

export const formatTrackDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export function getStatusSteps(status: string): number {
  const steps: Record<string, number> = {
    pending_payment: 0,
    paid: 1,
    preparing: 2,
    shipped: 3,
    delivered: 4,
    completed: 4,
  };
  return steps[status] ?? 0;
}
