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
