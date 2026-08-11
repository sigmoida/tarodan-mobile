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
