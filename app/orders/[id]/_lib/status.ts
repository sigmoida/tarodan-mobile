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

// İade durum haritası TEK kaynakta (`@/lib/shared/refundStatus`).
export { refundStatusMeta as REFUND_STATUS_META, useRefundStatusConfig } from '@/lib/shared/refundStatus';

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

