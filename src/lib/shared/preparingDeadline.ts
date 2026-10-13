/**
 * Sipariş dosyasındaki "kargoya verme son tarihi" notu — alıcı sipariş detayı
 * (`app/orders/[id]`) ile satıcı satış detayı (`app/sales/[id]`) ortak kullanır.
 * Web `orders/[id]/_lib/preparing-deadline.ts` + `PreparingDeadlineNotice` aynası.
 *
 * Tarih sunucudan gelir (`preparingDeadline`): tek seferlik uzatmada sunucu
 * yeni son tarihi aynı alana yazar, ekran hesap yapmaz. `extended`
 * (`preparingExtendedAt` dolu) uzatmanın kullanıldığını söyler — satıcıya
 * "son süre", alıcıya "gecikme + iptal hakkı" metni gösterilir.
 *
 * Not, sunucunun gerçekten yapacağından fazlasını vaat etmez; yalnız şu
 * durumda görünür:
 *  - parası alınmış ama henüz yola çıkmamış sipariş (`paid` / `preparing`), VE
 *  - koli taşıyıcıya devredilmemiş — sunucunun süre dolumu taramasıyla AYNI
 *    kural (hareket eden kargo durumu ya da `shippedAt` mührü), VE
 *  - son tarih henüz geçmemiş (geçmişse karar bir sonraki tarama turunda).
 */
import type { TFunction } from 'i18next';
import { isMembershipOrder } from './membershipOrder';

export type PreparingDeadlineAudience = 'buyer' | 'seller';

export interface PreparingDeadlineNotice {
  deadline: string;
  extended: boolean;
  audience: PreparingDeadlineAudience;
}

/** Notun okuduğu asgari sipariş şekli (sipariş + satış detay tipleri karşılar). */
export interface PreparingDeadlineOrder {
  status: string;
  orderNumber?: string | null;
  isMembership?: boolean | null;
  preparingDeadline?: string | null;
  preparingExtendedAt?: string | null;
  shipment?: { status?: string | null; shippedAt?: string | null } | null;
}

/**
 * Kargo öncesi iptalin açık olduğu statüler (ana repo
 * `PRE_SHIPMENT_CANCELLABLE_ORDER_STATUSES`). `processing`, sipariş detayının
 * bu iki API statüsünü normalize ettiği UI adıdır (`apiStatusToUi`).
 */
const PRE_SHIPMENT_STATUSES: readonly string[] = ['paid', 'preparing', 'processing'];

/** Taşıyıcıya geçmiş sayılan kargo durumları (ana repo `SHIPMENT_IN_MOTION_STATUSES`). */
const SHIPMENT_IN_MOTION_STATUSES: readonly string[] = [
  'picked_up',
  'in_transit',
  'at_delivery_branch',
  'out_for_delivery',
  'delivered',
  'return_in_progress',
  'returned',
];

function isHandedToCarrier(shipment: PreparingDeadlineOrder['shipment']): boolean {
  if (!shipment) return false;
  return (
    (!!shipment.status && SHIPMENT_IN_MOTION_STATUSES.includes(shipment.status)) ||
    shipment.shippedAt != null
  );
}

export function preparingDeadlineNoticeOf(
  order: PreparingDeadlineOrder,
  audience: PreparingDeadlineAudience,
  now: Date = new Date(),
): PreparingDeadlineNotice | null {
  if (!order.preparingDeadline) return null;
  if (isMembershipOrder(order)) return null;
  if (!PRE_SHIPMENT_STATUSES.includes(order.status)) return null;
  if (isHandedToCarrier(order.shipment)) return null;
  const deadlineMs = new Date(order.preparingDeadline).getTime();
  if (Number.isNaN(deadlineMs) || deadlineMs <= now.getTime()) return null;
  return {
    deadline: order.preparingDeadline,
    extended: Boolean(order.preparingExtendedAt),
    audience,
  };
}

/** Web `formatDateTime` ile aynı biçim: `GG.AA.YYYY SS:DD` (tr-TR). */
export function formatDeadline(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Notun başlığı + gövdesi (web anahtarları aynen). */
export function preparingDeadlineCopy(
  notice: PreparingDeadlineNotice,
  t: TFunction,
): { title: string; body: string } {
  const date = formatDeadline(notice.deadline);
  const seller = notice.audience === 'seller';
  return notice.extended
    ? {
        title: t('order.preparingExtendedTitle', { date }),
        body: seller ? t('order.preparingExtendedSeller') : t('order.preparingExtendedBuyer'),
      }
    : {
        title: t('order.preparingDeadlineTitle', { date }),
        body: seller ? t('order.preparingDeadlineSeller') : t('order.preparingDeadlineBuyer'),
      };
}
