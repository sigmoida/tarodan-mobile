import { useStatusConfig, refundRequestStatusConfig, type StatusConfig } from './status-configs';

/**
 * İade talebi durumu → rozet varyantı + KATALOG ANAHTARI. **Tek kaynak: web.**
 *
 * Eskiden üç ayrı yerde kopyalanmıştı ve ayrışmıştı (aynı `pending_review`
 * listede "Satıcı İncelemesinde" / sarı, detayda "Talep İnceleniyor" / mavi).
 * Artık web `refundRequestStatusConfig` ile birebir aynı: bekleyen sarı, biten
 * yeşil, reddedilen/itirazlı kırmızı, iptal nötr.
 */
export const refundStatusMeta = refundRequestStatusConfig;

/** `StatusBadge`'in beklediği, çevrilmiş config. */
export function useRefundStatusConfig(): Record<string, StatusConfig> {
  return useStatusConfig(refundRequestStatusConfig);
}
