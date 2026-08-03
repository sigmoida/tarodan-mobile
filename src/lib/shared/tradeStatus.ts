import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { theme } from '@/ui';
import type { BadgeVariant } from '@/ui';
import type { Ionicons } from '@expo/vector-icons';
import type { MessageKey } from '@/i18n/lib';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

/**
 * Takas durumu → etiket anahtarı + rozet varyantı + ikon. **Tek kaynak.**
 *
 * Bu harita ÜÇ ayrı yerde tanımlıydı ve üçü de birbirinden ayrılmıştı:
 *
 * - Kapsam: 16 / 17 / 17 durum. `returning` durumundaki bir takas kartta ham
 *   `returning` yazısı gösteriyordu; `initiator_received` de detay ekranında
 *   ham görünüyordu.
 * - Kelime: `at_warehouse` kartta "Depoda", rozette "Tarodan Deposunda";
 *   `shipping_to_recipients` kartta "Size Gönderiliyor", rozette "Alıcılara
 *   Gönderim". Aynı takas, iki ekranda iki farklı cümle.
 *
 * Etiket katalog anahtarı olarak tutulur (modül saf, hook çağıramaz); çeviri
 * `useTradeStatusConfig` ile render anında yapılır. `icon` yalnız adım/detay
 * görünümü için; rozet kullanan çağıranlar yok sayar.
 */
export const tradeStatusMeta: Record<
  string,
  { labelKey: MessageKey; variant: BadgeVariant; icon: IconName }
> = {
  pending: { labelKey: 'trade.statusPending', variant: 'warning', icon: 'time-outline' },
  accepted: { labelKey: 'trade.statusAccepted', variant: 'success', icon: 'checkmark-circle-outline' },
  rejected: { labelKey: 'trade.statusRejected', variant: 'danger', icon: 'close-circle-outline' },
  countered: { labelKey: 'trade.statusCountered', variant: 'info', icon: 'swap-horizontal-outline' },
  awaiting_payment: { labelKey: 'trade.statusAwaitingPayment', variant: 'warning', icon: 'card-outline' },
  shipping_to_warehouse: { labelKey: 'trade.statusShippingToWarehouse', variant: 'info', icon: 'cube-outline' },
  at_warehouse: { labelKey: 'trade.statusAtWarehouse', variant: 'primary', icon: 'business-outline' },
  admin_reviewing: { labelKey: 'trade.statusAdminReviewing', variant: 'info', icon: 'search-outline' },
  shipping_to_recipients: { labelKey: 'trade.statusShippingToRecipients', variant: 'primary', icon: 'send-outline' },
  returning: { labelKey: 'trade.statusReturning', variant: 'warning', icon: 'return-up-back-outline' },
  initiator_shipped: { labelKey: 'trade.statusInitiatorShipped', variant: 'info', icon: 'cube-outline' },
  receiver_shipped: { labelKey: 'trade.statusReceiverShipped', variant: 'info', icon: 'cube-outline' },
  both_shipped: { labelKey: 'trade.statusBothShipped', variant: 'info', icon: 'cube-outline' },
  initiator_received: { labelKey: 'trade.statusInitiatorReceived', variant: 'info', icon: 'checkmark-outline' },
  receiver_received: { labelKey: 'trade.statusReceiverReceived', variant: 'info', icon: 'checkmark-outline' },
  completed: { labelKey: 'trade.statusCompleted', variant: 'success', icon: 'checkmark-done-outline' },
  cancelled: { labelKey: 'trade.statusCancelled', variant: 'danger', icon: 'close-circle-outline' },
  disputed: { labelKey: 'trade.statusDisputed', variant: 'danger', icon: 'alert-circle-outline' },
};

/** Rozet/çip tüketicileri için çevrilmiş config. */
export function useTradeStatusConfig(): Record<string, { label: string; variant: BadgeVariant }> {
  const { t } = useTranslation();
  return useMemo(
    () =>
      Object.fromEntries(
        Object.entries(tradeStatusMeta).map(([status, meta]) => [
          status,
          { label: t(meta.labelKey), variant: meta.variant },
        ]),
      ),
    [t],
  );
}

/** Varyant → semantik renk. Detay/adım görünümü rozet yerine düz renk istiyor. */
const VARIANT_COLOR: Record<string, string> = {
  warning: theme.colors.warning[600]!,
  success: theme.colors.success[600]!,
  danger: theme.colors.danger[600]!,
  info: theme.colors.info[600]!,
  primary: theme.colors.primary[600]!,
  secondary: theme.colors.text.muted,
  default: theme.colors.text.muted,
};

/** Detay/adım görünümü için: çevrilmiş etiket + renk + ikon. */
export function useTradeStatusDetail(): Record<
  string,
  { label: string; color: string; icon: IconName }
> {
  const { t } = useTranslation();
  return useMemo(
    () =>
      Object.fromEntries(
        Object.entries(tradeStatusMeta).map(([status, meta]) => [
          status,
          {
            label: t(meta.labelKey),
            color: VARIANT_COLOR[meta.variant] ?? VARIANT_COLOR.default!,
            icon: meta.icon,
          },
        ]),
      ),
    [t],
  );
}
