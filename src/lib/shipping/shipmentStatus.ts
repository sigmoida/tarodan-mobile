import type { TFunction } from 'i18next';

/**
 * Sunucunun kargo durumları. Liste KAPALI DEĞİL — Sürat entegrasyonu yeni
 * durum ekleyebilir (`8f9ae671` kod 1'i `pending` → `picked_up` yaptı).
 * Bilinmeyen durumda HAM KOD BASILMAZ; nötr bir metin gösterilir, yoksa
 * ekranda `at_delivery_branch` yazar.
 */
const KNOWN = new Set([
  'label_created', 'pending', 'picked_up', 'in_transit', 'at_delivery_branch',
  'out_for_delivery', 'delivered', 'return_in_progress', 'returned',
  'cancelled', 'failed',
]);

export function shipmentStatusLabel(
  status: string | null | undefined,
  t: TFunction,
): string {
  const key = status && KNOWN.has(status) ? status : 'unknown';
  return t(`order.shipmentStatus.${key}` as any);
}

/**
 * Shipment statuses that do not count as a carrier handover: the label may be printed but the
 * parcel is still with the seller, and the server still allows a cancel (web
 * `PRE_HANDOVER_SHIPMENT_STATUSES`, API `shipment-handover.ts`).
 */
const PRE_HANDOVER_SHIPMENT_STATUSES: ReadonlySet<string> = new Set([
  'pending', 'label_created', 'cancelled', 'failed',
]);

/**
 * Whether a cancel must treat the parcel as handed over (web `hasShipped`, the server's cancel
 * rule): the handover stamp `shippedAt`, or any status outside the pre-handover list. An unknown
 * status counts as handed over, so the app never offers a cancel the server refuses.
 */
export function isPastHandover(
  shipment: { status?: string | null; shippedAt?: string | null } | null | undefined,
): boolean {
  if (!shipment) return false;
  if (shipment.shippedAt) return true;
  return !!shipment.status && !PRE_HANDOVER_SHIPMENT_STATUSES.has(shipment.status);
}

/** Paket hâlâ satıcıda: şube henüz fiziksel kabul etmedi. */
const AWAITING_DROPOFF = new Set(['label_created', 'pending']);

/**
 * "Takip bilgileri şubeye teslimden sonra görünecek" notu YALNIZ bu durumlarda
 * doğrudur. `providerTrackingId` hiçbir zaman gelmediği için kod-yok dalı her
 * siparişte çalışıyor; durum kapısı olmadan teslim edilmiş bir sipariş de
 * "hazırlanıyor" diyor (2026-08-11 Metro turu bulgusu).
 *
 * Durum bilinmiyorsa `true`: paketin yola çıktığını iddia edecek bilgi yok.
 */
export function isAwaitingDropoff(status: string | null | undefined): boolean {
  return !status || AWAITING_DROPOFF.has(status);
}
