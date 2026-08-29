import type { TFunction } from 'i18next';
import { theme } from '@/ui';

const { colors } = theme;

// API erişilemezse son çare fallback — DB MembershipTier seed değerleriyle hizalı
// (basic 49.99 / premium 99.99 / business 249.99). Normalde fiyat getTiers'tan gelir.
export const DEFAULT_MONTHLY: Record<string, number> = {
  basic: 49.99,
  premium: 99.99,
  business: 249.99,
};

// Fiyatları her zaman 2 ondalıkla göster (admin + membership/index ile aynı biçim);
// ham hesap artığı 3 ondalığı (örn. 419,916) önler → "419,92".
export const formatTL = (n: number): string =>
  n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * `t` çağrıldığı ANDA çözülür (bileşen `useMemo(() => buildMembershipTiers(t),
 * [t])` ile çağırmalı — modül seviyesinde sabitlenirse hazır olmadan donar,
 * bkz. UpgradePrompt / membershipTiers.buildTierNames).
 *
 * "15/50/200/1000/2/10/50" gibi sayılar bu ekrana özgü satın-alma-onayı kopyası
 * (checkout tier tablosu) — `membershipLimits.ts`teki FREE/PREMIUM_MEMBER_LIMITS
 * bunları TAŞIMIYOR (o sabitler farklı bir şeyi, ücretsiz/premium üyenin genel
 * hesap limitini, tanımlıyor). Drift riski gerçek: bu üç sayı grubu
 * `membershipTiers.ts`teki (ana /membership ekranı) ve `success.tsx`teki
 * (satın alma sonrası ekran) rakamlarla elle senkron tutuluyor.
 */
export const buildMembershipTiers = (t: TFunction) => ({
  basic: {
    id: 'basic',
    name: t('membership.basic'),
    price: 49,
    period: 'ay',
    features: [
      t('membership.tierFeatureFreeListings', { count: 15 }),
      t('membership.tierFeatureTotalListings', { count: 50 }),
      t('membership.tierFeatureTrade'),
      t('membership.tierFeatureCollectionCreate'),
      t('membership.tierFeatureFeaturedListings', { count: 2 }),
    ],
    color: colors.info[600]!,
  },
  premium: {
    id: 'premium',
    name: t('membership.premium'),
    price: 99,
    period: 'ay',
    features: [
      t('membership.tierFeatureFreeListings', { count: 50 }),
      t('membership.tierFeatureTotalListings', { count: 200 }),
      t('membership.tierFeatureTrade'),
      t('membership.tierFeatureCollectionCreate'),
      t('membership.tierFeatureFeaturedListings', { count: 10 }),
      // "Reklamsız deneyim" KALDIRILDI: banner'lar herkese gösteriliyor, hiçbir
      // katman bu vaadi veremiyor. Staging'de ölçüldü (2026-08-26):
      // `GET /membership/tiers` her katman için `isAdFree: null` döndürüyor.
      // Web aynı vaadi 2026-08-12'de kaldırdı (`cae3d05c4`).
      t('membership.prioritySupport'),
    ],
    color: colors.primary[600]!,
    popular: true,
  },
  business: {
    id: 'business',
    name: t('membership.business'),
    price: 499,
    period: 'ay',
    features: [
      t('membership.tierFeatureFreeListings', { count: 200 }),
      t('membership.tierFeatureTotalListings', { count: 1000 }),
      t('membership.tierFeatureTrade'),
      t('membership.tierFeatureCollectionCreate'),
      t('membership.tierFeatureFeaturedListings', { count: 50 }),
      t('membership.prioritySupport'),
      t('membership.tierFeatureApiAccess'),
      t('membership.tierFeatureSellerBadge'),
    ],
    color: colors.warning[500]!,
  },
});

export type MembershipTiers = ReturnType<typeof buildMembershipTiers>;
export type MembershipTierKey = keyof MembershipTiers;
