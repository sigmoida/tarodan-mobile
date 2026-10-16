import { StyleSheet, View } from 'react-native';
import { Text, theme } from '@/ui';
import { CAN_BUY_DIGITAL } from '@/lib/purchases';
import { PageShell } from '@/components/common/PageShell';

import { useMembership } from '../_hooks/useMembership';
import { PlanCard } from './_components/PlanCard';
import { MembershipPlansSkeleton } from '../_components/MembershipSkeletons';

/**
 * Üyelik Planları — salt görüntüleme: görünür her plan bir kart (ad + özellikler), kullanıcının
 * mevcut planı işaretli. Satın alma / yükseltme yok. Veri ve görünür plan kuralı `/membership`
 * ekranıyla aynı controller'dan (`useMembership`: /membership/me + /membership/tiers).
 * Satın alma kapalıyken (iOS/Android) fiyat ve web satın alma bağlantısı yok; alttaki not bunu
 * açıklar (harici satın almadan söz etmez — App Store 3.1.1).
 */
export default function MembershipPlansScreen() {
  const f = useMembership();

  return (
    <PageShell
      title={f.t('membership.title')}
      loading={f.loading}
      loadingFallback={<MembershipPlansSkeleton />}
      error={f.error}
      errorMessage={f.error ?? undefined}
      onRetry={f.fetchData}
    >
      <View style={styles.list}>
        {f.visibleTiers.map((tier) => (
          <PlanCard key={tier} f={f} tier={tier} />
        ))}
      </View>
      {!CAN_BUY_DIGITAL ? (
        <Text variant="caption" tone="subtle" style={styles.note} testID="membership-plans-note">
          {f.t('membership.plansInAppNote')}
        </Text>
      ) : null}
    </PageShell>
  );
}

const styles = StyleSheet.create({
  list: { gap: theme.spacing[4] },
  note: { textAlign: 'center' },
});
