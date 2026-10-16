import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  SkeletonBlock,
  SkeletonKeyValueRow,
  SkeletonLine,
  SkeletonMediaRow,
  SkeletonPage,
  SkeletonSectionCard,
  SkeletonTimeline,
  theme,
} from '@/ui';

const { radius, spacing } = theme;

/**
 * İade talebi detayı iskeleti (`PageShell` `loadingFallback`) — durum kartı (#numara + rozet, ürün
 * satırı), "İade bilgileri" satırları ve zaman çizelgesi. İptal düğmesi yalnız talep sahibine ve
 * bekleyen talebe çıktığı için iskelette yok.
 */
export function RefundDetailSkeleton() {
  return (
    <SkeletonPage testID="refund-detail-skeleton">
      <SkeletonSectionCard title={false} style={styles.card}>
        <View style={styles.cardHeader}>
          <SkeletonLine variant="caption" width="25%" />
          <SkeletonBlock width={spacing[20]} height={spacing[6]} borderRadius={radius.full} />
        </View>
        <SkeletonMediaRow
          size={spacing[12] + spacing[2]}
          lines={[
            { variant: 'body', width: '80%' },
            { variant: 'body', width: '30%' },
          ]}
        />
      </SkeletonSectionCard>
      <SkeletonSectionCard style={styles.card}>
        <SkeletonKeyValueRow />
        <SkeletonKeyValueRow />
        <SkeletonKeyValueRow />
        <SkeletonKeyValueRow />
      </SkeletonSectionCard>
      <SkeletonSectionCard>
        <SkeletonTimeline steps={3} dot={spacing[2]} />
      </SkeletonSectionCard>
    </SkeletonPage>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing[3] },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing[3] },
});
