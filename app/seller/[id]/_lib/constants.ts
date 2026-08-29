import { Dimensions } from 'react-native';
import { theme } from '@/ui';
import type { MessageKey } from '@/i18n/lib/generated/keys';

const { colors } = theme;

const { width } = Dimensions.get('window');
export const CARD_WIDTH = (width - 48) / 2;

// Değer (`fast_shipper`, …) API'den gelen sabit bir rozet kodu — veridir,
// çevrilmez. Yalnız `labelKey` katalogdan çözülür (§3: value stays, label moves).
export const BADGE_INFO: Record<string, { labelKey: MessageKey; icon: string; color: string }> = {
  fast_shipper: { labelKey: 'seller.badgeFastShipper', icon: 'rocket-outline', color: colors.info[600]! },
  trusted_seller: { labelKey: 'seller.badgeTrustedSeller', icon: 'shield-checkmark', color: colors.success[600]! },
  responsive: { labelKey: 'seller.badgeResponsive', icon: 'chatbubble-outline', color: colors.info[600]! },
  elite_collector: { labelKey: 'seller.badgeEliteCollector', icon: 'diamond-outline', color: colors.warning[500]! },
  hall_of_fame: { labelKey: 'seller.badgeHallOfFame', icon: 'trophy-outline', color: colors.warning[500]! },
};
