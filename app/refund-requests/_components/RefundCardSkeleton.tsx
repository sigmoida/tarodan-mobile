import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  SkeletonBlock,
  SkeletonLine,
  SkeletonMediaRow,
  SkeletonSectionCard,
  theme,
} from '@/ui';

const { radius, spacing } = theme;

/**
 * İade talebi kartı iskeleti (`RefundList` kartıyla aynı): #numara + durum rozeti, ürün satırı
 * (56pt görsel, başlık / neden / satıcı, sağda fiyat). İptal düğmesi yalnız bekleyen taleplerde.
 */
export function RefundCardSkeleton({ testID }: { testID?: string }) {
  return (
    <SkeletonSectionCard title={false} style={styles.card} testID={testID}>
      <View style={styles.cardHeader}>
        <SkeletonLine variant="caption" width="25%" />
        <SkeletonBlock width={spacing[20]} height={spacing[6]} borderRadius={radius.full} />
      </View>
      <SkeletonMediaRow
        size={spacing[12] + spacing[2]}
        lines={[
          { variant: 'body', width: '80%' },
          { variant: 'bodySm', width: '60%' },
          { variant: 'bodySm', width: '45%' },
        ]}
      />
    </SkeletonSectionCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing[3] },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing[3] },
});
