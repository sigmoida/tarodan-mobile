import { offerStatusMeta } from '@/lib/shared/offerStatus';
import { statusVariantColors } from '@/lib/shared/status-colors';

/**
 * Teklif detay statü banner renkleri. Renk rolü web `offerStatusConfig`
 * varyantından gelir (`accepted` yeşil, `rejected`/`cancelled` kırmızı,
 * `countered` marka tonu…). `counter_offered` eski eş adı `offerStatusMeta`'da çözülür; bilinmeyen durum
 * bekleyen (sarı) sayılır.
 */
export function statusColor(status: string): { bg: string; fg: string } {
  return statusVariantColors(offerStatusMeta[status]?.variant ?? 'warning');
}
