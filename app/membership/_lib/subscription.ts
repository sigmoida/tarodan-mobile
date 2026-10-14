import type { TFunction } from 'i18next';
import { theme } from '@/ui';

const { colors } = theme;

// Abonelik tipleri + saf durum-türetme yardımcıları. Eski "Aboneliğim" ekranı
// (settings/subscription) Üyelik Planı ekranıyla birleşti; durum/yenileme/bitiş bilgisi
// artık `MembershipCurrentPlan`'da, mobilde salt görüntüleme (iptal/yükseltme yok).

export interface MembershipTier {
  id: string;
  name: string;
  type: 'free' | 'basic' | 'premium' | 'business';
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
  limits: {
    maxListings: number;
    maxImagesPerListing: number;
    maxAddresses: number;
    maxSavedSearches: number;
    maxMessagesPerDay: number;
    listingExpireDays: number;
    canTrade: boolean;
    canCreateCollections: boolean;
    canFeatureListings: boolean;
  };
}

export interface Subscription {
  id: string;
  userId: string;
  tierId: string;
  tier: MembershipTier;
  status: 'active' | 'cancelled' | 'past_due' | 'expired';
  billingPeriod: 'monthly' | 'yearly';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelledAt: string | null;
  createdAt: string;
}

export interface BillingHistory {
  id: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed';
  periodStart: string;
  periodEnd: string;
  createdAt: string;
  invoiceUrl?: string;
}

export const isPremiumTier = (tier: MembershipTier | null): boolean => {
  return tier?.type === 'premium' || tier?.type === 'business';
};

export const isSubscriptionActive = (subscription: Subscription | null): boolean => {
  if (!subscription) return false;
  // İptal edilmiş (cancelled) üyelik, ödenen dönem (currentPeriodEnd) bitene kadar
  // premium özelliklerini KULLANMAYA devam eder ("süre bitince üyelik gider").
  // past_due (ödeme onaylanmamış) premium sayılmaz; backend isPremiumEntitled ile aynı kural.
  const eligibleStatus = subscription.status === 'active' || subscription.status === 'cancelled';
  return eligibleStatus && new Date(subscription.currentPeriodEnd) > new Date();
};

export const getDaysUntilRenewal = (subscription: Subscription | null): number => {
  if (!subscription) return 0;
  const endDate = new Date(subscription.currentPeriodEnd);
  const now = new Date();
  const diffTime = endDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// `t` MUST come from a live useTranslation()/schemaT at the call site — this
// module is a route-local `_lib`, not a hook/component, so it can't resolve
// its own translator (see CLAUDE.md §8 / membershipLimits.ts note).
export const formatBillingPeriod = (t: TFunction, period: 'monthly' | 'yearly'): string => {
  return period === 'monthly' ? t('membership.monthly') : t('membership.yearly');
};

export const getSubscriptionStatusText = (t: TFunction, status: Subscription['status']): { text: string; color: string } => {
  switch (status) {
    case 'active':
      return { text: t('common.active'), color: colors.success[600]! };
    case 'cancelled':
      return { text: t('common.cancelled'), color: colors.danger[500]! };
    case 'past_due':
      return { text: t('membership.paymentOverdue'), color: colors.warning[500]! };
    case 'expired':
      return { text: t('offer.statusExpired'), color: colors.gray[400] };
    default:
      return { text: t('common.unknown'), color: colors.gray[400] };
  }
};

export type SubscriptionChipVariant = 'neutral' | 'success' | 'warning' | 'danger';

const STATUS_CHIP: Record<Subscription['status'], SubscriptionChipVariant> = {
  active: 'success',
  cancelled: 'warning',
  past_due: 'danger',
  expired: 'neutral',
};

/** Mevcut üyelik yanıtının (GET /membership/current) abonelik alanları — hepsi opsiyonel. */
export interface SubscriptionFields {
  tier?: { type?: string } | null;
  status?: Subscription['status'];
  /** API şu an döndürmüyor; gelirse "Plan" satırı çizilir. */
  billingPeriod?: Subscription['billingPeriod'];
  autoRenew?: boolean;
  currentPeriodEnd?: string;
}

/**
 * Dönem sonu tarihinin etiketi: iptal edilmiş ya da otomatik yenilemesi kapalı abonelikte
 * "Bitiş Tarihi"; yenilenecekse satın alma açık platformda "Sonraki Ödeme", kapalı platformda
 * (iOS/Android — ödeme/satın alma referansı yok) "Yenilenme Tarihi".
 */
export type PeriodEndLabelKey =
  | 'membership.endDateLabel'
  | 'membership.nextPaymentLabel'
  | 'membership.renewalDateLabel';

export function periodEndLabelKey(
  opts: { isCancelled: boolean; autoRenew?: boolean },
  canBuyDigital: boolean,
): PeriodEndLabelKey {
  if (opts.isCancelled || opts.autoRenew === false) return 'membership.endDateLabel';
  return canBuyDigital ? 'membership.nextPaymentLabel' : 'membership.renewalDateLabel';
}

/**
 * Üyelik planı kartının abonelik özeti (salt görüntüleme). `hasDetails` yalnız ücretli katmanda
 * ve yanıt durum + dönem sonu taşıyorsa açılır; aksi halde kart eski tek satırlık yenileme
 * notuna düşer. Ücretsiz üyelik (backend her kullanıcıya ~100 yıllık aktif kayıt açar) premium
 * sayılmaz — web `profile/membership` ile aynı kural.
 */
export function deriveSubscriptionSummary(t: TFunction, m: SubscriptionFields | null | undefined) {
  const tierType = m?.tier?.type ?? 'free';
  const hasDetails = !!m && tierType !== 'free' && !!m.status && !!m.currentPeriodEnd;
  if (!hasDetails) {
    return { hasDetails: false as const };
  }
  const status = m.status!;
  const end = m.currentPeriodEnd!;
  const daysLeft = getDaysUntilRenewal({ currentPeriodEnd: end } as Subscription);
  return {
    hasDetails: true as const,
    isCancelled: status === 'cancelled',
    autoRenew: m.autoRenew,
    daysLeft,
    periodEnd: end,
    billingPeriodLabel: m.billingPeriod ? formatBillingPeriod(t, m.billingPeriod) : null,
    statusLabel: getSubscriptionStatusText(t, status).text,
    statusChipVariant: STATUS_CHIP[status] ?? 'neutral',
  };
}
