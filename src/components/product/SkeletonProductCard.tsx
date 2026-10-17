import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SkeletonBlock, SkeletonLine, theme } from '@/ui';
import type { ProductCardLayout } from './ProductCard';
import { PRODUCT_CARD_METRICS as PM } from './productCardMetrics';

const { colors } = theme;

export interface SkeletonProductCardProps {
  layout?: ProductCardLayout;
  /** Kartın `showMeta`'sıyla aynı: meta satırı (puan/beğeni/görüntülenme) yer tutucusu. */
  showMeta?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * `ProductCard` iskeleti — kartla AYNI geometri (`PRODUCT_CARD_METRICS`): grid'de kare görsel +
 * 2 satır başlık + meta + çizgili fiyat bandı; listede 80pt görsel + başlık/meta + sağa yaslı fiyat.
 * Kart gelince görsel, başlık ve fiyat satırları yerinden oynamaz.
 */
export function SkeletonProductCard({ layout = 'grid', showMeta = true, style, testID }: SkeletonProductCardProps) {
  if (layout === 'list') {
    return (
      <View style={[styles.listCard, style]} testID={testID}>
        <SkeletonBlock width={PM.list.imageSize} height={PM.list.imageSize} borderRadius={PM.list.radius} />
        <View style={styles.listBody}>
          <SkeletonLine variant="body" lineHeight={PM.list.titleLineHeight} width="90%" />
          <SkeletonLine variant="body" lineHeight={PM.list.titleLineHeight} width="60%" />
          {showMeta ? <SkeletonLine variant="caption" width="40%" style={styles.listMeta} /> : null}
        </View>
        <View style={styles.listPrice}>
          <SkeletonLine variant="h3" width="30%" />
        </View>
      </View>
    );
  }
  return (
    <View style={[styles.gridCard, style]} testID={testID}>
      <SkeletonBlock width="100%" borderRadius={0} style={styles.square} />
      <View style={styles.gridBody}>
        <SkeletonLine variant="bodySm" lineHeight={PM.grid.titleLineHeight} width="95%" />
        <SkeletonLine variant="bodySm" lineHeight={PM.grid.titleLineHeight} width="65%" style={styles.gridTitleLast} />
        {showMeta ? (
          <SkeletonLine variant="caption" lineHeight={PM.grid.metaLineHeight} width="55%" style={styles.gridMeta} />
        ) : null}
        <View style={styles.priceBlock}>
          <SkeletonLine variant="body" lineHeight={PM.grid.priceLineHeight} width="50%" />
        </View>
      </View>
    </View>
  );
}

const frame: ViewStyle = {
  borderWidth: PM.borderWidth,
  borderColor: colors.border.DEFAULT,
  backgroundColor: colors.surface.elevated,
};

const styles = StyleSheet.create({
  gridCard: { ...frame, flex: 1, overflow: 'hidden', borderRadius: PM.grid.radius },
  square: { height: undefined, aspectRatio: 1 },
  gridBody: { padding: PM.grid.bodyPadding },
  gridTitleLast: { marginBottom: PM.grid.titleGap },
  gridMeta: { marginBottom: PM.grid.metaGap },
  priceBlock: {
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    paddingTop: PM.grid.priceTopPadding,
  },
  listCard: {
    ...frame,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: PM.list.gap,
    padding: PM.list.padding,
    borderRadius: PM.list.radius,
  },
  listBody: { flex: 1, minWidth: 0 },
  listMeta: { marginTop: theme.spacing[0.5] },
  listPrice: { width: '100%', alignItems: 'flex-end' },
});
