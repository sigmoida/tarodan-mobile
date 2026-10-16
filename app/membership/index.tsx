import { CAN_BUY_DIGITAL } from '@/lib/purchases';
import { PageShell } from '@/components/common/PageShell';

import { useMembership } from './_hooks/useMembership';
import {
  MembershipBanners,
  MembershipCurrentPlan,
  MembershipExplorePlansCard,
  MembershipBillingToggle,
  MembershipTierList,
} from './_components/MembershipSections';

/**
 * Membership plans — THIN screen. The `useMembership` controller owns the
 * membership/tiers fetch, billing period, tier visibility/guard, and price
 * getters; this file composes banners, current plan, toggle, and tier cards
 * inside the shared PageShell (yalnız görünüm; satın alma kapıları değişmedi).
 */
export default function MembershipScreen() {
  const f = useMembership();

  return (
    <PageShell
      title={f.t('mobile.membershipTitle')}
      onBack={f.guardLocked ? f.handleLockedExit : f.handleBack}
      loading={f.loading}
      error={f.error}
      errorMessage={f.error ?? undefined}
      onRetry={f.fetchData}
    >
      <MembershipBanners f={f} />
      <MembershipCurrentPlan f={f} />
      <MembershipExplorePlansCard f={f} />
      {/* Fiyatlar ve paket kartları iOS ve Android'de yok: uygulama içi dijital
          satış IAP/Play Billing'siz yapılamıyor (Guideline 3.1.1, Play ödeme
          politikası) ve fiyat göstermek 2.1(b)'nin "abonelik referansı"
          tanımına giriyor. */}
      {CAN_BUY_DIGITAL && (
        <>
          <MembershipBillingToggle f={f} />
          <MembershipTierList f={f} />
        </>
      )}
    </PageShell>
  );
}
