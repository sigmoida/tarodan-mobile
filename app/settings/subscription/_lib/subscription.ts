import type { TFunction } from 'i18next';
import { theme } from '@/ui';

const { colors } = theme;

// Faz 1'de subscriptionStore'dan buraya taşındı: abonelik ekranına ait tipler +
// saf durum-türetme yardımcıları. Store artık React Query hook'u (useSubscription).

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
