import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  SkeletonLine,
  SkeletonMetricGrid,
  SkeletonPage,
  SkeletonSectionCard,
  theme,
} from '@/ui';

const QUICK_ACTION_ROWS = 6;

/**
 * Satıcı panosu iskeleti (`PageShell` `loadingFallback`) — karşılama kartı, 2×2 istatistik
 * döşemeleri ve altı satırlık "Hızlı işlemler" kartı (satır = 44pt dokunma hedefi). Toplam özet kartı
 * veriye bağlı geldiği için iskelette yok (gelince altta açılır, üstteki hiçbir şey kaymaz).
 */
export function SellerDashboardSkeleton() {
  return (
    <SkeletonPage testID="seller-dashboard-skeleton">
      <SkeletonSectionCard>
        <SkeletonLine variant="bodySm" width="95%" />
        <SkeletonLine variant="bodySm" width="70%" />
      </SkeletonSectionCard>
      <SkeletonMetricGrid count={4} />
      <SkeletonSectionCard>
        {Array.from({ length: QUICK_ACTION_ROWS }, (_, i) => (
          <View key={i} style={styles.quickAction}>
            <SkeletonLine variant="body" width="50%" />
          </View>
        ))}
      </SkeletonSectionCard>
    </SkeletonPage>
  );
}

const styles = StyleSheet.create({
  quickAction: { minHeight: theme.minTouchTarget, justifyContent: 'center' },
});
