import type { MessageKey } from '@/i18n/lib/generated/keys';

// Değer (`fast_shipper`, …) API'den gelen sabit bir rozet kodu — veridir, çevrilmez. Yalnız
// etiket katalogdan çözülür (§3: value stays, label moves). Rozetler ikonsuz, tek tonlu Badge.
export const BADGE_LABEL: Record<string, MessageKey> = {
  fast_shipper: 'seller.badgeFastShipper',
  trusted_seller: 'seller.badgeTrustedSeller',
  responsive: 'seller.badgeResponsive',
  elite_collector: 'seller.badgeEliteCollector',
  hall_of_fame: 'seller.badgeHallOfFame',
};
