import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { MessageKey } from '@/i18n/lib';
import type { BadgeVariant } from '@/ui';
import { apiStatusToUi, type UiOrderStatus } from '@/utils/orderStatus';

export interface Order {
  id: string;
  orderNumber: string;
  status: UiOrderStatus;
  totalAmount: number;
  product: {
    id: string;
    title: string;
    images?: Array<{ url: string }>;
    imageUrl?: string;
  };
  seller: {
    id: string;
    displayName: string;
  };
  trackingNumber?: string;
  createdAt: string;
  isBuyer?: boolean;
  hasProductRating?: boolean;
  hasSellerRating?: boolean;
  cancellationType?: 'iptal' | 'iade' | null;
  activeRefundRequest?: { id: string; status: string } | null;
}

/** Çok ürünlü sipariş grubu (tek checkout = tek kart, ürün başına ayrı kargo) */
export interface OrderGroup {
  id: string;
  groupNumber: string;
  totalAmount: number;
  status: string; // UiOrderStatus | 'mixed'
  createdAt: string;
  orders: Order[];
}

export type OrderListEntry =
  | { kind: 'order'; order: Order }
  | { kind: 'group'; group: OrderGroup };

export type FilterType =
  | 'all' | 'pending' | 'processing' | 'shipped' | 'delivered' | 'completed' | 'refunds';

/**
 * UI durum anahtarı -> rozet varyantı + KATALOG ANAHTARI.
 *
 * Etiketler burada sabit Türkçe olarak duruyordu; saf bir modül olduğu için
 * `useTranslation` çağıramıyor. Çözüm: modül anahtarı taşır, çeviri render
 * anında `useOrderStatusConfig` ile yapılır. Varyant (semantik renk) çeviriden
 * bağımsız, o burada kalır.
 *
 * ⚠️ `app/orders/group/[id]/_lib/status.ts` bunun İKİNCİ bir kopyasını
 * tutuyor (bu turdan önce de öyleydi); o rota kendi turunda aynı desene
 * geçirilmeli.
 */
export const uiOrderStatusMeta: Record<
  string,
  { labelKey: MessageKey; variant: BadgeVariant }
> = {
  pending: { labelKey: 'order.statusPendingPayment', variant: 'warning' },
  paid: { labelKey: 'order.statusPaid', variant: 'info' },
  processing: { labelKey: 'order.statusProcessing', variant: 'info' },
  shipped: { labelKey: 'order.statusShipped', variant: 'primary' },
  delivered: { labelKey: 'order.statusDelivered', variant: 'success' },
  awaiting_confirmation: { labelKey: 'order.statusAwaitingConfirmation', variant: 'warning' },
  completed: { labelKey: 'order.statusCompleted', variant: 'success' },
  cancelled: { labelKey: 'order.statusCancelled', variant: 'danger' },
  refunded: { labelKey: 'order.statusRefunded', variant: 'secondary' },
  refund_requested: { labelKey: 'order.statusRefundInProgress', variant: 'danger' },
  mixed: { labelKey: 'order.statusMixed', variant: 'info' },
};

/** `StatusBadge`'in beklediği çevrilmiş config. */
export function useOrderStatusConfig(): Record<string, { label: string; variant: BadgeVariant }> {
  const { t } = useTranslation();
  return useMemo(
    () =>
      Object.fromEntries(
        Object.entries(uiOrderStatusMeta).map(([status, meta]) => [
          status,
          { label: t(meta.labelKey), variant: meta.variant },
        ]),
      ),
    [t],
  );
}

/** Rozet dışında düz metin gerektiğinde (ör. erişilebilirlik etiketi). */
export function useStatusText(): (status: UiOrderStatus) => string {
  const config = useOrderStatusConfig();
  return (status) => config[status]?.label ?? String(status);
}

// Rozet önceliği: aktif iade > iptal > normal durum.
// - activeRefundRequest dolu ama tamamlanmadıysa → "İade Sürecinde" (sipariş
//   'delivered' kalsa bile).
// - İade TAMAMLANDIYSA (status 'refunded') → "İade Edildi"; aksi halde biten iade
//   "İade Sürecinde" görünür (pickActiveRefundRequest biten talebi de döndürür).
// - cancellationType === 'iptal' → "İptal Edildi" (status 'refunded' olsa bile
//   "İade Edildi" DEME).
// - Aksi halde siparişin kendi UI durumu.
export const badgeStatusOf = (o: any): string => {
  if (o?.activeRefundRequest) {
    return o.activeRefundRequest.status === 'refunded' ? 'refunded' : 'refund_requested';
  }
  if (o?.cancellationType === 'iptal') return 'cancelled';
  return o?.status;
};

// Kargo takip satırı: SADECE gerçek gönderi varken (trackingNumber dolu + kargo
// sonrası durum). İptal (cancellationType='iptal' / status cancelled) veya iade
// edilmiş siparişte gösterilmez; teslim öncesi placeholder kargo da gözükmez.
export const showOrderTracking = (o: Order): boolean =>
  !!o.trackingNumber &&
  o.cancellationType !== 'iptal' &&
  ['shipped', 'delivered', 'awaiting_confirmation', 'completed'].includes(o.status);

export const normalizeOrder = (rawOrder: any): Order => ({
  ...rawOrder,
  status: apiStatusToUi(rawOrder.status),
  totalAmount: Number(rawOrder.totalAmount ?? rawOrder.amount ?? 0),
  product: {
    ...(rawOrder.product || {}),
    id: rawOrder.product?.id ?? '',
    title: rawOrder.product?.title ?? '',
    images: rawOrder.product?.images,
    imageUrl: rawOrder.product?.imageUrl,
  },
});

export const formatOrderDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

export const formatOrderPrice = (price: number) => `₺${price.toLocaleString('tr-TR')}`;

// Yalnızca alıcı, teslim alınmış/tamamlanmış siparişi değerlendirebilir.
export const canRateOrder = (order: Order) =>
  order.isBuyer === true && ['delivered', 'completed'].includes(order.status);
