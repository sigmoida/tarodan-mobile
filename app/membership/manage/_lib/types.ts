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

/** Planlı değişiklik kartındaki dönem etiketi. */
export const BILLING_PERIOD_NAMES: Record<string, string> = {
  monthly: 'aylık',
  yearly: 'yıllık',
};

export const TIER_NAMES: Record<string, string> = {
  free: 'Ücretsiz Üyelik',
  basic: 'Temel Üyelik',
  premium: 'Premium Üyelik',
  business: 'Business Üyelik',
};
