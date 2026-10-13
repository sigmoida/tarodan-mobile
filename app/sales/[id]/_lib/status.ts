import { orderStatusConfig } from '@/lib/shared/status-configs';
import { statusVariantColors } from '@/lib/shared/status-colors';

/** API'nin kargo alt durumları web'deki tek `shipped` rengine bağlanır. */
const SHIPMENT_ALIASES = ['in_transit', 'out_for_delivery'];

/**
 * Sipariş statü banner renkleri (satıcı sipariş detayı). Renk rolü web
 * `orderStatusConfig` varyantından gelir (`paid` yeşil, `cancelled` kırmızı…),
 * ayrı bir renk tablosu tutulmaz.
 */
export function statusColor(status: string): { bg: string; fg: string } {
  const key = SHIPMENT_ALIASES.includes(status) ? 'shipped' : status;
  return statusVariantColors(orderStatusConfig[key]?.variant ?? 'outline');
}
