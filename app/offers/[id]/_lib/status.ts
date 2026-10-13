import { offerStatusConfig } from '@/lib/shared/status-configs';
import { statusVariantColors } from '@/lib/shared/status-colors';

/**
 * Teklif detay statü banner renkleri. Renk rolü web `offerStatusConfig`
 * varyantından gelir (`accepted` yeşil, `rejected`/`cancelled` kırmızı,
 * `countered` marka tonu…). `counter_offered` eski eş ad; bilinmeyen durum
 * bekleyen (sarı) sayılır.
 */
export function statusColor(status: string): { bg: string; fg: string } {
  const key = status === 'counter_offered' ? 'countered' : status;
  return statusVariantColors(offerStatusConfig[key]?.variant ?? 'warning');
}
