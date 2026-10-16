import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  SkeletonAvatar,
  SkeletonBlock,
  SkeletonButtonRow,
  SkeletonLine,
  SkeletonSectionCard,
  theme,
} from '@/ui';

const { radius, radiusRole, spacing } = theme;

/**
 * Teklif kartı iskeleti (`OfferCard` ile aynı sıra): ürün görseli + başlık + durum rozeti, fiyat satırı,
 * karşı taraf (avatar + iki satır) · tarih ve aksiyon düğmeleri (`size="sm"`).
 */
export function OfferCardSkeleton({ testID }: { testID?: string }) {
  return (
    <SkeletonSectionCard title={false} style={styles.body} testID={testID}>
      <View style={styles.topRow}>
        <SkeletonBlock width={spacing[16]} height={spacing[16]} borderRadius={radiusRole.productCard} />
        <View style={styles.titleCol}>
          <SkeletonLine variant="bodySm" width="85%" />
          <SkeletonLine variant="bodySm" width="55%" />
        </View>
        <SkeletonBlock width={spacing[16]} height={spacing[6]} borderRadius={radius.full} />
      </View>
      <View style={styles.priceRow}>
        <SkeletonLine variant="h3" width="30%" />
        <SkeletonLine variant="caption" width="35%" />
      </View>
      <View style={styles.metaRow}>
        <SkeletonAvatar size="sm" />
        <View style={styles.userText}>
          <SkeletonLine variant="caption" width="30%" />
          <SkeletonLine variant="bodySm" width="55%" />
        </View>
        <SkeletonLine variant="caption" width="22%" />
      </View>
      <SkeletonButtonRow count={3} size="sm" />
    </SkeletonSectionCard>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing[3] },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3] },
  titleCol: { flex: 1, minWidth: 0, gap: spacing[1] },
  priceRow: { flexDirection: 'row', alignItems: 'center', columnGap: spacing[2] },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  userText: { flex: 1, minWidth: 0 },
});
