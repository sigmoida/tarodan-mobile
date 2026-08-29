import type { TFunction } from 'i18next';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/ui';
import { FREE_MEMBER_LIMITS, PREMIUM_MEMBER_LIMITS } from '@/utils/membershipLimits';

const { colors } = theme;

export const TIER_ORDER = ['free', 'basic', 'premium', 'business'] as const;
export type TierType = (typeof TIER_ORDER)[number];

export const TIER_COLORS: Record<TierType, string> = {
  free: colors.gray[500]!,
  basic: colors.info[600]!,
  premium: colors.primary[600]!,
  business: colors.warning[500]!,
};

export const TIER_ICONS: Record<TierType, keyof typeof Ionicons.glyphMap> = {
  free: 'person-outline',
  basic: 'star-outline',
  premium: 'diamond-outline',
  business: 'briefcase-outline',
};

/**
 * Katman özellik listesi — `t` çağrıldığı ANDA çözülür (bileşen
 * `useMemo(() => buildTierFeatures(t), [t])` ile çağırmalı; modül seviyesinde
 * SABİTLENİRSE i18next hazır olmadan çözülür ve donar — bkz. UpgradePrompt).
 *
 * "10 ilan" / "5 resim" / "15 resim" sayıları `FREE_MEMBER_LIMITS` /
 * `PREMIUM_MEMBER_LIMITS`'teki gerçek sabitlerden geliyor (drift'i önlemek
 * için buradan referanslanıyor). "20 resim" (business) için ise elle
 * yazılmış bir sabit yok — BUSINESS_MEMBER_LIMITS diye bir kayıt
 * `membershipLimits.ts`'de tanımlı değil; bu sayı yalnız burada yaşıyor.
 */
export const buildTierFeatures = (t: TFunction): Record<TierType, string[]> => ({
  free: [
    t('membership.tierLimitListings', { count: FREE_MEMBER_LIMITS.maxListings }),
    t('membership.tierLimitPhotos', { count: FREE_MEMBER_LIMITS.maxImagesPerListing }),
    t('membership.tierLimitBasicSearch'),
    t('membership.tierLimitLimitedMessaging'),
  ],
  basic: [
    t('membership.tierLimitAdminManaged'),
    t('membership.tierLimitPhotos', { count: 10 }),
    t('membership.tierLimitAdvancedSearch'),
    t('membership.tierLimitMessaging'),
  ],
  premium: [
    t('membership.tierLimitUnlimitedListings'),
    t('membership.tierLimitPhotos', { count: PREMIUM_MEMBER_LIMITS.maxImagesPerListing }),
    t('membership.tierLimitPrioritySearch'),
    t('membership.tierLimitUnlimitedMessaging'),
    t('membership.featureTrade'),
    t('membership.tierLimitCollection'),
  ],
  business: [
    t('membership.tierLimitUnlimitedListings'),
    t('membership.tierLimitPhotos', { count: 20 }),
    t('membership.tierLimitHighestPriority'),
    t('membership.tierLimitUnlimitedEverything'),
    t('membership.tierFeatureApiAccess'),
  ],
});

export const buildTierNames = (t: TFunction): Record<TierType, string> => ({
  free: t('membership.free'),
  basic: t('membership.basic'),
  premium: t('membership.premium'),
  business: t('membership.business'),
});

// Fiyatları her zaman 2 ondalıkla göster (admin paneliyle birebir aynı biçim).
// Ham hesap artığı 3 ondalığı (örn. 419,916) ve kademeler arası ondalık/tam-sayı
// tutarsızlığını (419,916 vs 832) önler → "419,92", "839,92".
export const formatTL = (n: number): string =>
  n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export interface MembershipDetails {
  tier?: { type: string; name: string };
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  pendingPayment?: {
    id: string;
    tierType: string;
    tierName: string;
  } | null;
  pendingTierName?: string;
  pendingTierType?: string;
}

export interface PlatformSettings {
  free_listing_limit?: number;
  basic_listing_limit?: number;
  premium_listing_limit?: number;
  business_listing_limit?: number;
  basic_monthly_price?: number;
  basic_yearly_price?: number;
  premium_monthly_price?: number;
  premium_yearly_price?: number;
  business_monthly_price?: number;
  business_yearly_price?: number;
  yearly_discount_percentage?: number;
}

// GET /membership/tiers (DB MembershipTier) yanıtını ekranın beklediği
// PlatformSettings şekline çevirir — böylece getPrice/getListingLimit aynen kalır.
// Web profile/membership ile aynı eşleme.
export function mapTiersToSettings(list: any[]): PlatformSettings {
  const by = (type: string) => (Array.isArray(list) ? list.find((x) => x?.type === type) : undefined);
  const num = (v: any): number | undefined => (v === undefined || v === null ? undefined : Number(v));
  const free = by('free');
  const basic = by('basic');
  const premium = by('premium');
  const business = by('business');
  const pm = num(premium?.monthlyPrice);
  const py = num(premium?.yearlyPrice);
  /**
   * Yıllık indirim rozeti — TÜM ücretli katmanların oranından, EN DÜŞÜĞÜ.
   *
   * Eskiden yalnız premium'un oranı okunuyordu. Katmanların oranı ayrıştığı gün
   * (admin bir katmanın yıllık fiyatını değiştirdiğinde) rozet, bazı kartlarda
   * olandan FAZLASINI vaat ediyordu. Bugün üçü de %20 olduğu için görünür etkisi
   * yok — yani bu sessiz bir yalan, ölçümle değil ancak okumayla yakalanır.
   * Web aynı düzeltmeyi 2026-08-13'te yaptı; kural oradan alındı: "rozet hiçbir
   * kartta olandan fazlasını vaat edemez."
   */
  const yearlyPct = (monthly?: number, yearly?: number) =>
    monthly && yearly && monthly * 12 > 0
      ? Math.round((1 - yearly / (monthly * 12)) * 100)
      : undefined;
  const discountPcts = [
    yearlyPct(num(basic?.monthlyPrice), num(basic?.yearlyPrice)),
    yearlyPct(pm, py),
    yearlyPct(num(business?.monthlyPrice), num(business?.yearlyPrice)),
  ].filter((v): v is number => typeof v === 'number' && v > 0);
  const pct = discountPcts.length ? Math.min(...discountPcts) : undefined;
  return {
    free_listing_limit: num(free?.maxTotalListings),
    basic_listing_limit: num(basic?.maxTotalListings),
    premium_listing_limit: num(premium?.maxTotalListings),
    business_listing_limit: num(business?.maxTotalListings),
    basic_monthly_price: num(basic?.monthlyPrice),
    basic_yearly_price: num(basic?.yearlyPrice),
    premium_monthly_price: pm,
    premium_yearly_price: py,
    business_monthly_price: num(business?.monthlyPrice),
    business_yearly_price: num(business?.yearlyPrice),
    yearly_discount_percentage: pct ?? 20,
  };
}

// Son çare fallback (yalnız getTiers API'si tamamen erişilemezse) — DB
// MembershipTier seed değerleriyle ve checkout.tsx DEFAULT_MONTHLY ile hizalı.
// Gerçek fiyat/indirim her zaman canlı getTiers'tan gelir; bu sabitler
// yalnız ağ hatasında devreye girer.
export const getDefaultMonthly = (tier: TierType): number => {
  switch (tier) {
    case 'basic': return 49.99;
    case 'premium': return 99.99;
    case 'business': return 249.99;
    default: return 0;
  }
};
