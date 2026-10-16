import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  SkeletonBlock,
  SkeletonLine,
  SkeletonMetricGrid,
  SkeletonPage,
  SkeletonSectionCard,
  theme,
} from '@/ui';
import { BAR_WIDTH, CHART_HEIGHT } from '../_lib/styles';

const { spacing } = theme;

/** Çubuk yükseklikleri (grafik yüksekliğinin oranı) — yalnız iskelet görünümü. */
const BAR_RATIOS = [0.45, 0.7, 0.55, 0.9, 0.6, 0.8, 0.5] as const;
const TOP_LISTING_ROWS = 3;

/**
 * Satıcı analitiği iskeleti (`PageShell` `loadingFallback`) — iki satır ortalı özet döşemeleri
 * (2×2), "Son 7 gün" çubuk grafiği kartı (grafik alanı `CHART_HEIGHT`) ve "En iyi ilanların" kartı.
 * Premium bölümleri kullanıcı planına bağlı olduğu için iskelette yok.
 */
export function AnalyticsSkeleton() {
  return (
    <SkeletonPage testID="analytics-skeleton">
      <SkeletonMetricGrid count={4} centered />
      <SkeletonSectionCard>
        <View style={styles.chart}>
          {BAR_RATIOS.map((ratio, i) => (
            <View key={i} style={styles.chartBar}>
              <SkeletonBlock width={BAR_WIDTH} height={`${ratio * 100}%`} />
            </View>
          ))}
        </View>
        <View style={styles.chartFooter}>
          <SkeletonLine variant="bodySm" width="40%" />
        </View>
      </SkeletonSectionCard>
      <SkeletonSectionCard>
        {Array.from({ length: TOP_LISTING_ROWS }, (_, i) => (
          <View key={i} style={styles.listing}>
            <SkeletonLine variant="label" width={spacing[8]} />
            <View style={styles.listingInfo}>
              <SkeletonLine variant="bodySm" width="70%" />
              <SkeletonLine variant="caption" width="35%" />
            </View>
          </View>
        ))}
      </SkeletonSectionCard>
    </SkeletonPage>
  );
}

const styles = StyleSheet.create({
  chart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: CHART_HEIGHT,
    paddingHorizontal: spacing[2],
  },
  chartBar: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end', marginHorizontal: spacing[1] },
  chartFooter: { marginTop: spacing[4], alignItems: 'center' },
  listing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    minHeight: theme.minTouchTarget,
    paddingVertical: spacing[2],
  },
  listingInfo: { flex: 1, gap: spacing[0.5] },
});
