import type { TFunction } from 'i18next';

export interface MembershipMe {
  tier?: { type?: string; name?: string };
  tierType?: string;
  tierName?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  nextBillingDate?: string;
  nextBillingAmount?: number;
  autoRenew?: boolean;
  status?: string;
  /** Dönem sonunda geçilecek plan (varsa) — POST /membership/cancel-scheduled-change ile iptal edilir. */
  scheduledTierType?: string;
  scheduledBillingPeriod?: string;
}

/**
 * Planlı değişiklik kartındaki dönem etiketi / katman adı. `t` çağrıldığı
 * ANDA çözülür — modül seviyesinde sabitlenirse hazır olmadan donar (bkz.
 * UpgradePrompt, membershipTiers.buildTierNames).
 */
export const buildBillingPeriodNames = (t: TFunction): Record<string, string> => ({
  monthly: t('membership.monthly'),
  yearly: t('membership.yearly'),
});

export const buildTierNames = (t: TFunction): Record<string, string> => ({
  free: t('membership.freeMembership'),
  basic: t('membership.basicMembership'),
  premium: t('membership.premiumMembership'),
  business: t('membership.businessMembership'),
});
