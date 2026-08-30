import type { TFunction } from 'i18next';
import type { Ionicons } from '@expo/vector-icons';
import { theme } from '@/ui';

const { colors } = theme;

// Rozet/hızlı-işlem renk tonları (design-token tabanlı).
export const benefitTints = [
  { bg: colors.success[50]!, fg: colors.success[600]! },
  { bg: colors.info[50]!, fg: colors.info[600]! },
  { bg: colors.danger[50]!, fg: colors.danger[600]! },
  { bg: colors.warning[50]!, fg: colors.warning[600]! },
] as const;

export const quickActionTint = { bg: colors.primary[50]!, fg: colors.primary[700]! } as const;

export interface ProfileCollection {
  id: string;
  name: string;
  coverImageUrl?: string;
  coverImage?: string;
  itemCount?: number;
  isPublic?: boolean;
}

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

// Kimliği doğrulanmış kullanıcı için "Hızlı Erişim" ızgarası.
/** Rozet gösterebilen hızlı erişim satırları — sayaç `useHomeBadges`'den gelir. */
export type QuickActionBadgeKey = 'pendingOffers' | 'pendingTrades';

/**
 * Hızlı erişim öğeleri.
 *
 * Etiketler çeviriden geldiği için liste artık bir FABRİKA: modül seviyesinde
 * kurulsaydı `t` daha hazır olmadan çalışır ve etiketler ilk dilde donardı
 * (aynı gerekçe zod şemalarında da geçerli — bkz. `@/utils/validation` başı).
 *
 * `icon` / `to` / `testID` gibi dilden bağımsız alanlar değişmedi; test bunları
 * doğrudan okuyor.
 */
export type QuickActionItem = {
  icon: IoniconName;
  label: string;
  to: string;
  testID?: string;
  badgeKey?: QuickActionBadgeKey;
  /** Yalnızca kurumsal hesaplarda göster (companyName + taxId var demek kurumsal). */
  requiresBusiness?: boolean;
};

export const buildQuickActionItems = (t: TFunction): QuickActionItem[] => [
  { icon: 'pricetag', label: t('nav.myListings'), to: '/settings/my-listings' },
  { icon: 'cube', label: t('nav.myOrders'), to: '/orders', testID: 'profile-orders-link' },
  { icon: 'cash', label: t('mobile.quickMySales'), to: '/sales', testID: 'profile-sales-link' },
  { icon: 'arrow-undo', label: t('mobile.quickRefundRequests'), to: '/refund-requests', testID: 'profile-refunds-link' },
  { icon: 'heart', label: t('favorites.myFavorites'), to: '/favorites' },
  { icon: 'chatbubbles', label: t('nav.messages'), to: '/messages' },
  { icon: 'albums', label: t('collection.likedCollections'), to: '/settings/liked-collections' },
  { icon: 'swap-horizontal', label: t('trade.myTrades'), to: '/trades', testID: 'profile-trades-link', badgeKey: 'pendingTrades' },
  { icon: 'pricetags', label: t('mobile.quickMyOffers'), to: '/offers', testID: 'profile-offers-link', badgeKey: 'pendingOffers' },
  { icon: 'stats-chart', label: t('mobile.settingsStatistics'), to: '/settings/analytics' },
  { icon: 'help-circle', label: t('nav.help'), to: '/help' },
  {
    icon: 'document-text',
    label: t('mobile.quickBusinessApplication'),
    to: '/settings/business-application',
    testID: 'settings-business-application',
    requiresBusiness: true,
  },
];
