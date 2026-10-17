import type { TFunction } from 'i18next';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { WebStatusVariant } from './status-variant';
import type { MessageKey } from '@/i18n/lib';

/**
 * Durum haritaları — web `packages/shared/src/status-configs.ts` ile AYNI model
 * ve AYNI değerler (tek dil): her durum `{ labelKey, variant }` taşır, etiket
 * katalog anahtarıdır (`status.<alan>.<değer>`), varyant web'in 5'li sözlüğüdür
 * (default | success | warning | danger | outline).
 *
 * Çözüm: bileşen içinde `useStatusConfig(map)` (çevrilmiş `{label, variant}`),
 * hook dışında `resolveStatusConfig(map, t)`. Mobil, web'de bulunmayan durumlar
 * için (ör. `countered` takas, `mixed` sipariş grubu) ilgili modülde AYRI satır
 * ekler — burası web'in aynasıdır, mobil özel satır eklenmez.
 *
 * Web'deki, mobilde karşılığı olmayan haritalar (admin rolü, vergi kapsamı,
 * log önem derecesi, indirim tipi vb.) bilerek alınmadı; kullanan ekran yok.
 */

export type { WebStatusVariant };

/** Ekrana basılacak, dili çözülmüş durum etiketi. */
export interface StatusConfig {
  label: string;
  variant: WebStatusVariant;
}

/** Ham durum tanımı: etiket YERİNE katalog anahtarı taşır. */
export interface StatusConfigDef {
  labelKey: MessageKey;
  variant: WebStatusVariant;
}

export type StatusConfigDefMap = Record<string, StatusConfigDef>;

/** Ham tanımı, verilen çeviriciyle ekrana basılabilir etiketlere çözer. */
export function resolveStatusConfig(
  def: StatusConfigDefMap,
  translate: (key: MessageKey) => string,
): Record<string, StatusConfig> {
  const resolved: Record<string, StatusConfig> = {};
  for (const [value, entry] of Object.entries(def)) {
    resolved[value] = {
      label: translate(entry.labelKey),
      variant: entry.variant,
    };
  }
  return resolved;
}

/** `resolveStatusConfig`'in hook hâli — aktif dile göre render anında çözer. */
export function useStatusConfig(def: StatusConfigDefMap): Record<string, StatusConfig> {
  const { t } = useTranslation();
  return useMemo(() => resolveStatusConfig(def, (key) => t(key)), [def, t]);
}

/**
 * Bir enum config'inden ham değeri okunabilir etikete çevir.
 * Eşleşme yoksa fallback (verilmezse ham değer / '—') döner.
 */
export function enumLabel(
  config: Record<string, StatusConfig>,
  value?: string | null,
  fallback?: string,
): string {
  if (!value) return fallback ?? '—';
  return config[value]?.label ?? fallback ?? value;
}

/**
 * Order status → Badge mapping
 * Used in: orders page, order detail, track-order, dashboard
 */
export const orderStatusConfig: StatusConfigDefMap = {
  pending_payment: {
    labelKey: "status.order.pending_payment",
    variant: "warning",
  },
  paid: {
    labelKey: "status.order.paid",
    variant: "success",
  },
  preparing: {
    labelKey: "status.order.preparing",
    variant: "default",
  },
  shipped: {
    labelKey: "status.order.shipped",
    variant: "default",
  },
  delivered: {
    labelKey: "status.order.delivered",
    variant: "success",
  },
  awaiting_buyer_confirmation: {
    labelKey: "status.order.awaiting_buyer_confirmation",
    variant: "warning",
  },
  completed: {
    labelKey: "status.order.completed",
    variant: "success",
  },
  cancelled: {
    labelKey: "status.order.cancelled",
    variant: "danger",
  },
  refund_requested: {
    labelKey: "status.order.refund_requested",
    variant: "warning",
  },
  refunded: {
    labelKey: "status.order.refunded",
    variant: "outline",
  },
};

/**
 * Trade status → Badge mapping
 * Used in: trades page, trade detail, dashboard
 */
export const tradeStatusConfig: StatusConfigDefMap = {
  pending: {
    labelKey: "status.trade.pending",
    variant: "warning",
  },
  accepted: {
    labelKey: "status.trade.accepted",
    variant: "success",
  },
  rejected: {
    labelKey: "status.trade.rejected",
    variant: "danger",
  },
  awaiting_payment: {
    labelKey: "status.trade.awaiting_payment",
    variant: "warning",
  },
  shipping_to_warehouse: {
    labelKey: "status.trade.shipping_to_warehouse",
    variant: "default",
  },
  at_warehouse: {
    labelKey: "status.trade.at_warehouse",
    variant: "default",
  },
  admin_reviewing: {
    labelKey: "status.trade.admin_reviewing",
    variant: "default",
  },
  shipping_to_recipients: {
    labelKey: "status.trade.shipping_to_recipients",
    variant: "default",
  },
  returning: {
    labelKey: "status.trade.returning",
    variant: "warning",
  },
  initiator_shipped: {
    labelKey: "status.trade.initiator_shipped",
    variant: "default",
  },
  receiver_shipped: {
    labelKey: "status.trade.receiver_shipped",
    variant: "default",
  },
  both_shipped: {
    labelKey: "status.trade.both_shipped",
    variant: "default",
  },
  initiator_received: {
    labelKey: "status.trade.initiator_received",
    variant: "default",
  },
  receiver_received: {
    labelKey: "status.trade.receiver_received",
    variant: "default",
  },
  completed: {
    labelKey: "status.trade.completed",
    variant: "success",
  },
  cancelled: {
    labelKey: "status.trade.cancelled",
    variant: "danger",
  },
  disputed: {
    labelKey: "status.trade.disputed",
    variant: "danger",
  },
};

/**
 * RefundRequest status → Badge mapping
 * Used in: admin refund-requests page, mobile order detail refund banner
 */
export const refundRequestStatusConfig: StatusConfigDefMap = {
  pending_review: {
    labelKey: "status.refundRequest.pending_review",
    variant: "warning",
  },
  approved: {
    labelKey: "status.refundRequest.approved",
    variant: "success",
  },
  wait_for_delivery: {
    labelKey: "status.refundRequest.wait_for_delivery",
    variant: "default",
  },
  return_shipment_open: {
    labelKey: "status.refundRequest.return_shipment_open",
    variant: "default",
  },
  return_in_transit: {
    labelKey: "status.refundRequest.return_in_transit",
    variant: "default",
  },
  return_delivered: {
    labelKey: "status.refundRequest.return_delivered",
    variant: "default",
  },
  refunded: {
    labelKey: "status.refundRequest.refunded",
    variant: "success",
  },
  rejected: {
    labelKey: "status.refundRequest.rejected",
    variant: "danger",
  },
  disputed: {
    labelKey: "status.refundRequest.disputed",
    variant: "danger",
  },
  cancelled: {
    labelKey: "status.refundRequest.cancelled",
    variant: "outline",
  },
};

/**
 * Offer status → Badge mapping
 * Used in: offers page
 */
export const offerStatusConfig: StatusConfigDefMap = {
  pending: {
    labelKey: "status.offer.pending",
    variant: "warning",
  },
  accepted: {
    labelKey: "status.offer.accepted",
    variant: "success",
  },
  rejected: {
    labelKey: "status.offer.rejected",
    variant: "danger",
  },
  countered: {
    labelKey: "status.offer.countered",
    variant: "default",
  },
  expired: {
    labelKey: "status.offer.expired",
    variant: "outline",
  },
  cancelled: {
    labelKey: "status.offer.cancelled",
    variant: "danger",
  },
  payment_expired: {
    labelKey: "status.offer.payment_expired",
    variant: "warning",
  },
};

/**
 * Payment status → Badge mapping
 * Used in: payments page, payment detail
 */
export const paymentStatusConfig: StatusConfigDefMap = {
  pending: {
    labelKey: "status.payment.pending",
    variant: "warning",
  },
  processing: {
    labelKey: "status.payment.processing",
    variant: "default",
  },
  completed: {
    labelKey: "status.payment.completed",
    variant: "success",
  },
  failed: {
    labelKey: "status.payment.failed",
    variant: "danger",
  },
  refunded: {
    labelKey: "status.payment.refunded",
    variant: "outline",
  },
};

/**
 * Product status → Badge mapping
 * Used in: admin products, profile listings
 */
export const productStatusConfig: StatusConfigDefMap = {
  pending: {
    labelKey: "status.product.pending",
    variant: "warning",
  },
  active: {
    labelKey: "status.product.active",
    variant: "success",
  },
  inactive: {
    labelKey: "status.product.inactive",
    variant: "outline",
  },
  sold: {
    labelKey: "status.product.sold",
    variant: "default",
  },
  reserved: {
    labelKey: "status.product.reserved",
    variant: "default",
  },
  rejected: {
    labelKey: "status.product.rejected",
    variant: "danger",
  },
  deleted: {
    labelKey: "status.product.deleted",
    variant: "danger",
  },
  suspended: {
    labelKey: "status.product.suspended",
    variant: "danger",
  },
};

/** Kargo/gönderi durumu (ShipmentStatus). */
export const shipmentStatusConfig: StatusConfigDefMap = {
  pending: {
    labelKey: "status.shipment.pending",
    variant: "warning",
  },
  label_created: {
    labelKey: "status.shipment.label_created",
    variant: "default",
  },
  picked_up: {
    labelKey: "status.shipment.picked_up",
    variant: "default",
  },
  in_transit: {
    labelKey: "status.shipment.in_transit",
    variant: "default",
  },
  at_delivery_branch: {
    labelKey: "status.shipment.at_delivery_branch",
    variant: "default",
  },
  out_for_delivery: {
    labelKey: "status.shipment.out_for_delivery",
    variant: "default",
  },
  delivered: {
    labelKey: "status.shipment.delivered",
    variant: "success",
  },
  failed: {
    labelKey: "status.shipment.failed",
    variant: "danger",
  },
  return_in_progress: {
    labelKey: "status.shipment.return_in_progress",
    variant: "warning",
  },
  returned: {
    labelKey: "status.shipment.returned",
    variant: "outline",
  },
  cancelled: {
    labelKey: "status.shipment.cancelled",
    variant: "danger",
  },
};

/**
 * Support ticket status → label/Badge mapping (TicketStatus enum).
 */
export const ticketStatusConfig: StatusConfigDefMap = {
  open: {
    labelKey: "status.ticket.open",
    variant: "warning",
  },
  in_progress: {
    labelKey: "status.ticket.in_progress",
    variant: "default",
  },
  waiting_customer: {
    labelKey: "status.ticket.waiting_customer",
    variant: "warning",
  },
  resolved: {
    labelKey: "status.ticket.resolved",
    variant: "success",
  },
  closed: {
    labelKey: "status.ticket.closed",
    variant: "outline",
  },
};

/**
 * İade nedeni (RefundReason) — TEK kaynak.
 *
 * Bu harita dört ayrı dosyada üç farklı sürümle yazılmıştı; hepsi buraya
 * bağlandı. Etiketler kullanıcıya hem seçicide hem listelerde göründüğü için
 * tek bir ifade kullanılır — iki bağlamda iki farklı sözcük kullanmak,
 * sözlüklerin ilk ayrışma sebebiydi.
 *
 * i18n göçü (§ i18n-kuyruk, 2026-08-29): bu tek küme modül seviyesinde
 * DONMUŞ Türkçe etiket taşıyordu — dosyanın geri kalanı (32 export) kimse
 * tarafından tüketilmiyor ve web'deki paylaşılan aynanın (`packages/shared/
 * src/status-configs.ts`, kendisi de çevrilmemiş) kopyası olduğu için
 * kasten dokunulmadı; bkz. dosya başı notu. Bu küme FARKLI: canlı dört
 * çağıran var (aşağıda listelenen), o yüzden `build*Config(t)` kalıbına
 * (src/i18n/CLAUDE.md › Build labels at call time) geçirildi — sabit değişkenler ÇAĞRI ANINDA aktif dile
 * göre üretilen fonksiyonlara dönüştü. Yalnızca ETİKETLER dile göre değişir;
 * `variant` ve enum kodları (backend sözleşmesi) sabit kalır, o yüzden ayrı
 * tutuldu.
 */
const REFUND_REASON_VARIANTS: Record<string, WebStatusVariant> = {
  changed_mind: 'outline',
  damaged: 'danger',
  wrong_item: 'warning',
  not_as_described: 'warning',
  missing_parts: 'warning',
  counterfeit: 'danger',
  // `defective` + `buyer_damaged`: sunucu enum'unda VARDI, burada yoktu.
  // Staging'de ölçüldü (2026-08-26, `POST /orders/:id/refund-requests` geçersiz
  // bir kodla tam listeyi geri veriyor). Eksik olduklarında iki şey oluyordu:
  // bu kodu taşıyan bir talep ekranda ham `snake_case` basılıyordu ve alıcı
  // web'de seçebildiği iki nedeni mobilde seçemiyordu.
  defective: 'danger',
  buyer_damaged: 'warning',
  lost_in_transit: 'danger',
  delivery_delayed: 'warning',
  other: 'outline',
};

/** Her nedenin katalog anahtarı — `t()` ile ÇAĞRI ANINDA çözülür. */
const REFUND_REASON_LABEL_KEYS: Record<string, MessageKey> = {
  changed_mind: 'order.refundReasonChangedMind',
  damaged: 'order.refundReasonDamaged',
  wrong_item: 'order.refundReasonWrongItem',
  not_as_described: 'order.refundReasonNotAsDescribed',
  missing_parts: 'order.refundReasonMissingParts',
  counterfeit: 'order.refundReasonCounterfeit',
  defective: 'order.refundReasonDefective',
  buyer_damaged: 'order.refundReasonBuyerDamaged',
  lost_in_transit: 'order.refundReasonLostInTransit',
  delivery_delayed: 'order.refundReasonDeliveryDelayed',
  other: 'order.refundReasonOther',
};

/** İade nedeni haritasını AKTİF dile göre kurar — modül seviyesinde DONDURULMAZ. */
export function buildRefundReasonConfig(t: TFunction): Record<string, StatusConfig> {
  const config: Record<string, StatusConfig> = {};
  for (const reason of Object.keys(REFUND_REASON_LABEL_KEYS)) {
    config[reason] = { label: t(REFUND_REASON_LABEL_KEYS[reason]), variant: REFUND_REASON_VARIANTS[reason] };
  }
  return config;
}

/** Sunucunun `RefundReason` enum'u — staging'de ölçülen tam liste (2026-08-26). */
export const REFUND_REASONS = [
  'delivery_delayed',
  'changed_mind',
  'damaged',
  'wrong_item',
  'not_as_described',
  'missing_parts',
  'counterfeit',
  'defective',
  'buyer_damaged',
  'lost_in_transit',
  'other',
] as const;

/**
 * Nedenin okunur etiketi. Sunucunun tam enum listesi doğrulanamadı, o yüzden
 * tanımadığımız bir kod SESSİZCE düşmez — ham kod basılır ki ekranda boş bir
 * "Sebep:" satırı kalmasın.
 */
export function refundReasonLabel(reason: string | null | undefined, t: TFunction): string {
  if (!reason) return '';
  const key = REFUND_REASON_LABEL_KEYS[reason];
  return key ? t(key) : reason;
}

/**
 * Alıcının iade talebi açarken SEÇEBİLECEĞİ nedenler.
 *
 * Sözlüğün tamamı değil: `lost_in_transit` operasyonel bir TESPİT (kargo
 * takibinden gelir), `other` ise politika çözümü olmayan serbest kova. İkisi de
 * gösterilebilmeli ama seçtirilmemeli — bu yüzden gösterim
 * (`REFUND_REASON_LABEL_KEYS`) ile seçim listesi ayrı, etiketleri ortak.
 *
 * Liste artık ELLE yazılmıyor, kod kümesinden TÜRETİLİYOR ve kural web'inkiyle
 * birebir aynı (`BUYER_SELECTABLE_REFUND_REASONS`). Elle yazıldığı sürece iki
 * kod (`defective`, `buyer_damaged`) sunucu enum'unda olduğu hâlde mobilde
 * seçilemiyordu ve `other` web'de sunulmadığı hâlde burada sunuluyordu.
 * Türetme, sunucuya yeni bir neden eklendiğinde tek bir sözlük satırının
 * yetmesini sağlıyor.
 */
export const BUYER_SELECTABLE_REFUND_REASONS = Object.keys(
  REFUND_REASON_LABEL_KEYS,
).filter((reason) => reason !== 'lost_in_transit' && reason !== 'other');

/** Seçim listesi (value+label) — AKTİF dile göre ÇAĞRI ANINDA kurulur. */
export function buildRefundReasonOptions(t: TFunction): Array<{ value: string; label: string }> {
  const config = buildRefundReasonConfig(t);
  return BUYER_SELECTABLE_REFUND_REASONS
    // Sözlükte olmayan bir kod (yazım hatası) yalnız listeden DÜŞER; `!` ile
    // iddia etmek import anında TypeError atıp iade ekranını beyaz ekrana
    // çeviriyordu — tek bir harf yüzünden.
    .flatMap((value) => {
      const c = config[value];
      return c ? [{ value, label: c.label }] : [];
    });
}


