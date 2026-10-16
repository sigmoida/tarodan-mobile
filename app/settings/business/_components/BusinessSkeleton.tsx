import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  SkeletonAvatar,
  SkeletonChipTabs,
  SkeletonLine,
  SkeletonMetricGrid,
  SkeletonPage,
  SkeletonSectionCard,
  theme,
} from '@/ui';

const { spacing } = theme;

/** Haftalık/koleksiyon istatistik kartı: iki ortalı değer + etiket çifti. */
function PairCard() {
  return (
    <SkeletonSectionCard>
      <View style={styles.pair}>
        {[0, 1].map((i) => (
          <View key={i} style={styles.pairItem}>
            <SkeletonLine variant="h2" width={spacing[16]} />
            <SkeletonLine variant="caption" width={spacing[12]} />
          </View>
        ))}
      </View>
    </SkeletonSectionCard>
  );
}

/**
 * İşletme paneli iskeleti (`PageShell` `loadingFallback`) — şirket başlık kartı (XL avatar + ad +
 * "İşletme paneli" satırı), 3 sekme çipi ve varsayılan "Genel bakış" sekmesi: 5 ortalı sayaç
 * döşemesi, toplam ciro kartı ve iki istatistik çifti kartı.
 */
export function BusinessSkeleton() {
  return (
    <SkeletonPage testID="business-skeleton">
      <SkeletonSectionCard title={false}>
        <View style={styles.company}>
          <SkeletonAvatar size="xl" />
          <View style={styles.companyDetails}>
            <SkeletonLine variant="h2" width="65%" />
            <SkeletonLine variant="bodySm" width="40%" />
          </View>
        </View>
      </SkeletonSectionCard>
      <SkeletonChipTabs count={3} />
      <SkeletonMetricGrid count={5} centered />
      <SkeletonSectionCard>
        <SkeletonLine variant="displaySm" width="45%" />
      </SkeletonSectionCard>
      <PairCard />
      <PairCard />
    </SkeletonPage>
  );
}

const styles = StyleSheet.create({
  company: { flexDirection: 'row', alignItems: 'center', gap: spacing[4] },
  companyDetails: { flex: 1, gap: spacing[1] },
  pair: { flexDirection: 'row', justifyContent: 'space-around' },
  pairItem: { alignItems: 'center', gap: spacing[1] },
});
