import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { BadgeVariant } from '@/ui';
import type { MessageKey } from '@/i18n/lib';

/**
 * İade talebi durumu → rozet varyantı + KATALOG ANAHTARI. **Tek kaynak.**
 *
 * Bu harita üç ayrı yerde kopyalanmıştı ve **zaten ayrışmıştı**: aynı
 * `pending_review` durumu iade listesinde "Satıcı İncelemesinde" / sarı,
 * sipariş detayında "Talep İnceleniyor" / mavi görünüyordu. Kullanıcı aynı
 * talebi iki ekranda farklı kelime ve farklı renkle görüyordu.
 *
 * Etiketler sabit metin değil katalog anahtarı (modül saf, `useTranslation`
 * çağıramaz); çeviri `useRefundStatusConfig` ile render anında yapılır.
 *
 * Varyantlar bilerek **anlamlı**: bekleyen sarı, biten yeşil, reddedilen
 * kırmızı. Hepsini `info` yapmak rozetin taşıdığı bilgiyi siliyordu.
 */
export const refundStatusMeta: Record<
  string,
  { labelKey: MessageKey; variant: BadgeVariant }
> = {
  pending_review: { labelKey: 'refund.statusPendingReview', variant: 'warning' },
  approved: { labelKey: 'refund.statusApproved', variant: 'success' },
  wait_for_delivery: { labelKey: 'refund.statusWaitForDelivery', variant: 'info' },
  return_shipment_open: { labelKey: 'refund.statusReturnShipmentOpen', variant: 'info' },
  return_in_transit: { labelKey: 'refund.statusReturnInTransit', variant: 'primary' },
  return_delivered: { labelKey: 'refund.statusReturnDelivered', variant: 'success' },
  refunded: { labelKey: 'refund.statusRefunded', variant: 'success' },
  rejected: { labelKey: 'order.statusRejected', variant: 'danger' },
  disputed: { labelKey: 'refund.statusDisputed', variant: 'warning' },
  cancelled: { labelKey: 'common.cancelled', variant: 'danger' },
};

/** `StatusBadge`'in beklediği, çevrilmiş config. */
export function useRefundStatusConfig(): Record<string, { label: string; variant: BadgeVariant }> {
  const { t } = useTranslation();
  return useMemo(
    () =>
      Object.fromEntries(
        Object.entries(refundStatusMeta).map(([status, meta]) => [
          status,
          { label: t(meta.labelKey), variant: meta.variant },
        ]),
      ),
    [t],
  );
}
