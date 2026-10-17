import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  SkeletonAvatar,
  SkeletonButtonRow,
  SkeletonChipTabs,
  SkeletonLine,
  SkeletonMetricGrid,
  SkeletonPage,
  SkeletonSectionCard,
  theme,
} from '@/ui';
import { ProductGridSkeleton } from '@/components/product';

const { spacing } = theme;

/**
 * Satıcı profili iskeleti (`PageShell` `loadingFallback`) — gerçek ekranla aynı sıra: başlık kartı
 * (avatar + ad/konum/üyelik satırları, Mesaj/Takip düğmeleri, 2×2 sayaç döşemeleri), sekme çipleri
 * ve ürün ızgarası. Yalnız paylaşılan iskelet bloklarından kurulur.
 */
export function SellerProfileSkeleton() {
  return (
    <SkeletonPage testID="seller-profile-skeleton">
      <SkeletonSectionCard title={false} style={styles.header}>
        <View style={styles.identity}>
          <SkeletonAvatar size="lg" />
          <View style={styles.identityInfo}>
            <SkeletonLine variant="h2" width="60%" />
            <SkeletonLine variant="caption" width="35%" />
            <SkeletonLine variant="bodySm" width="50%" />
          </View>
        </View>
        <SkeletonButtonRow count={2} />
        <SkeletonMetricGrid count={4} />
      </SkeletonSectionCard>
      <SkeletonChipTabs count={3} />
      <ProductGridSkeleton count={4} />
    </SkeletonPage>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing[4] },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing[4] },
  identityInfo: { flex: 1, minWidth: 0, gap: spacing[1] },
});
