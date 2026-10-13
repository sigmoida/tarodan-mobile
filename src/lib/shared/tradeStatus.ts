import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Ionicons } from '@expo/vector-icons';
import { tradeStatusConfig, type StatusConfig, type StatusConfigDef } from './status-configs';
import { statusVariantSolid } from './status-colors';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

/**
 * Takas durumu → etiket anahtarı + rozet varyantı. **Tek kaynak: web.**
 *
 * Etiket ve varyant web `tradeStatusConfig`'ten (`@/lib/shared/status-configs`)
 * gelir. Mobilin eklediği tek durum `countered` (karşı teklif; web'de yok).
 * Kart, rozet ve detay başlığı aynı kaynağı okur — aynı takas iki ekranda iki
 * farklı cümle olmaz.
 *
 * Etiket katalog anahtarı olarak tutulur (modül saf, hook çağıramaz); çeviri
 * `useTradeStatusConfig` ile render anında yapılır.
 */
export const tradeStatusMeta: Record<string, StatusConfigDef> = {
  ...tradeStatusConfig,
  countered: { labelKey: 'trade.statusCountered', variant: 'default' },
};

/**
 * Detay başlığındaki DURUM ikonu (işlevsel — başlık/adım görünümü). Rozetler
 * ikon taşımaz (web'de de yok).
 */
const TRADE_STATUS_ICON: Record<string, IconName> = {
  pending: 'time-outline',
  accepted: 'checkmark-circle-outline',
  rejected: 'close-circle-outline',
  countered: 'swap-horizontal-outline',
  awaiting_payment: 'card-outline',
  shipping_to_warehouse: 'cube-outline',
  at_warehouse: 'business-outline',
  admin_reviewing: 'search-outline',
  shipping_to_recipients: 'send-outline',
  returning: 'return-up-back-outline',
  initiator_shipped: 'cube-outline',
  receiver_shipped: 'cube-outline',
  both_shipped: 'cube-outline',
  initiator_received: 'checkmark-outline',
  receiver_received: 'checkmark-outline',
  completed: 'checkmark-done-outline',
  cancelled: 'close-circle-outline',
  disputed: 'alert-circle-outline',
};

/** Rozet/çip tüketicileri için çevrilmiş config. */
export function useTradeStatusConfig(): Record<string, StatusConfig> {
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
            color: statusVariantSolid(meta.variant),
            icon: TRADE_STATUS_ICON[status] ?? 'help-circle-outline',
          },
        ]),
      ),
    [t],
  );
}
