import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { BadgeVariant } from '@/ui';
import type { MessageKey } from '@/i18n/lib';

/**
 * Sipariş durumu → rozet varyantı + KATALOG ANAHTARI. **Tek kaynak.**
 *
 * Bu harita üç ayrı rotada (liste, detay, grup) birebir kopyalanmıştı. Üçü
 * aynıyken bile tehlikeliydi: bir durum eklendiğinde diğer iki kopya sessizce
 * eksik kalır ve kullanıcı aynı siparişi bir ekranda etiketli, diğerinde ham
 * durum koduyla görürdü.
 *
 * Etiketler burada sabit metin DEĞİL, katalog anahtarıdır — modül saf olduğu
 * için `useTranslation` çağıramaz; çeviri `useOrderStatusConfig` ile render
 * anında yapılır. Varyant (semantik renk) çeviriden bağımsız olduğu için
 * burada kalır.
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

/** `StatusBadge`'in beklediği, çevrilmiş config. */
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

/** Rozet dışında düz metin gerektiğinde (filtre çipi, boş durum başlığı…). */
export function useStatusText(): (status: string) => string {
  const config = useOrderStatusConfig();
  return (status) => config[status]?.label ?? String(status);
}
