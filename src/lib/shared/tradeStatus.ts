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

export type TradeViewerRole = 'initiator' | 'receiver';

/** Giriş yapan kullanıcının takastaki tarafı; taraf değilse `undefined`. */
export function tradeViewerRole(
  trade: { initiatorId?: string; receiverId?: string },
  userId?: string | null,
): TradeViewerRole | undefined {
  if (!userId) return undefined;
  if (trade.initiatorId === userId) return 'initiator';
  if (trade.receiverId === userId) return 'receiver';
  return undefined;
}

/**
 * Bakan tarafa göre durum haritası.
 *
 * Web bu dört durumu (`initiator_shipped`, `receiver_shipped`,
 * `initiator_received`, `receiver_received`) iki tarafa da AYNI etiketle
 * gösteriyor ("Gönderildi" / "Karşı Taraf Gönderdi") — etiketler gönderen
 * tarafın gözünden yazılmış, alıcı kendi gönderisini "karşı taraf gönderdi"
 * okuyabiliyor. Mobil bunu BİLEREK perspektife göre seçer: kim gönderdi açık
 * yazılır ("Siz Gönderdiniz" / "Karşı Taraf Gönderdi"). Taraf bilinmiyorsa
 * (ör. yönetici) taraf adıyla nötr etiket ("Gönderen Kargoda"). Diğer
 * durumlar web ile aynı.
 */
export function tradeStatusMetaFor(role?: TradeViewerRole): Record<string, StatusConfigDef> {
  const them = (key: 'receiver_shipped' | 'receiver_received') => tradeStatusConfig[key]!;
  const mine = (key: 'trade.statusYouShipped' | 'trade.statusYouReceived'): StatusConfigDef => ({
    labelKey: key,
    variant: 'default',
  });
  if (role === 'initiator') {
    return {
      ...tradeStatusMeta,
      initiator_shipped: mine('trade.statusYouShipped'),
      receiver_shipped: them('receiver_shipped'),
      initiator_received: mine('trade.statusYouReceived'),
      receiver_received: them('receiver_received'),
    };
  }
  if (role === 'receiver') {
    return {
      ...tradeStatusMeta,
      initiator_shipped: them('receiver_shipped'),
      receiver_shipped: mine('trade.statusYouShipped'),
      initiator_received: them('receiver_received'),
      receiver_received: mine('trade.statusYouReceived'),
    };
  }
  return {
    ...tradeStatusMeta,
    initiator_shipped: { labelKey: 'trade.statusInitiatorShipped', variant: 'default' },
    receiver_shipped: { labelKey: 'trade.statusReceiverShipped', variant: 'default' },
    initiator_received: { labelKey: 'trade.statusInitiatorReceived', variant: 'default' },
    receiver_received: { labelKey: 'trade.statusReceiverReceived', variant: 'default' },
  };
}

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
export function useTradeStatusConfig(role?: TradeViewerRole): Record<string, StatusConfig> {
  const { t } = useTranslation();
  return useMemo(
    () =>
      Object.fromEntries(
        Object.entries(tradeStatusMetaFor(role)).map(([status, meta]) => [
          status,
          { label: t(meta.labelKey), variant: meta.variant },
        ]),
      ),
    [t, role],
  );
}

/** Detay/adım görünümü için: çevrilmiş etiket + renk + ikon. */
export function useTradeStatusDetail(role?: TradeViewerRole): Record<
  string,
  { label: string; color: string; icon: IconName }
> {
  const { t } = useTranslation();
  return useMemo(
    () =>
      Object.fromEntries(
        Object.entries(tradeStatusMetaFor(role)).map(([status, meta]) => [
          status,
          {
            label: t(meta.labelKey),
            color: statusVariantSolid(meta.variant),
            icon: TRADE_STATUS_ICON[status] ?? 'help-circle-outline',
          },
        ]),
      ),
    [t, role],
  );
}
