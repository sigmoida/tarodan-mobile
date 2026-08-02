import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
// Sipariş/iade statü haritaları + sabitler — TEK kaynak.
import type { BadgeVariant } from '@/ui';
import type { MessageKey } from '@/i18n/lib';
import { REFUND_REASON_OPTIONS } from '@/lib/shared/status-configs';

export const MAX_EVIDENCE_PHOTOS = 5;
// Saticiya ödeme = teslim + 14 gün cayma penceresi.
export const COOLING_OFF_DAYS = 14;

// 14 gün koşulsuz iade (Mesafeli Satış cayma hakkı): sebep/foto opsiyonel.
// Liste TEK kaynaktan (`@/lib/shared/status-configs`) gelir — etiketleri burada
// tekrar yazmak, sözlüğün dört dosyada üç sürüme ayrılmasının sebebiydi.
export const REFUND_REASONS = REFUND_REASON_OPTIONS;

export const REFUND_STATUS_META: Record<string, { labelKey: MessageKey; variant: BadgeVariant }> = {
  pending_review: { labelKey: 'refund.statusPendingReview', variant: 'info' },
  approved: { labelKey: 'refund.statusApproved', variant: 'info' },
  wait_for_delivery: { labelKey: 'refund.statusWaitForDelivery', variant: 'info' },
  return_shipment_open: { labelKey: 'refund.statusReturnShipmentOpen', variant: 'info' },
  return_in_transit: { labelKey: 'order.shipStatusReturnInProgress', variant: 'info' },
  return_delivered: { labelKey: 'refund.statusReturnDelivered', variant: 'info' },
  refunded: { labelKey: 'order.shipStatusReturned', variant: 'success' },
  rejected: { labelKey: 'order.statusRejected', variant: 'danger' },
  disputed: { labelKey: 'refund.statusDisputed', variant: 'warning' },
  cancelled: { labelKey: 'common.cancelled', variant: 'secondary' },
};

// Durum haritası TEK kaynakta (`@/lib/shared/orderStatus`); burada yeniden
// tanımlamak üç rotanın sessizce ayrışmasına yol açıyordu.
export { uiOrderStatusMeta, useOrderStatusConfig, useStatusText } from '@/lib/shared/orderStatus';

// Rozet önceliği: aktif iade > iptal > normal durum.
export const badgeStatusOf = (o: any): string => {
  if (o?.activeRefundRequest) {
    return o.activeRefundRequest.status === 'refunded' ? 'refunded' : 'refund_requested';
  }
  if (o?.cancellationType === 'iptal') return 'cancelled';
  return o?.status;
};

/** `StatusBadge` için çevrilmiş iade durum config'i (aynı desen: anahtar + hook). */
export function useRefundStatusConfig(): Record<string, { label: string; variant: BadgeVariant }> {
  const { t } = useTranslation();
  return useMemo(
    () =>
      Object.fromEntries(
        Object.entries(REFUND_STATUS_META).map(([status, meta]) => [
          status,
          { label: t(meta.labelKey), variant: meta.variant },
        ]),
      ),
    [t],
  );
}
