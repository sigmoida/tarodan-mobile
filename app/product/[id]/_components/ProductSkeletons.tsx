import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Skeleton, SkeletonText, theme, useHeaderBarInset, usePageGutter } from '@/ui';
import { useProductDetailLayout } from '../_lib/layout';

const { spacing, radiusRole } = theme;

/** Bölüm kartı iskeletinin yüksekliği (pt) — açıklama / satıcı / özellik kartlarının ortalama boyu. */
const SECTION_SKELETON_HEIGHT = spacing[24] + spacing[12];

/**
 * Product detail skeleton (web): square image + title / price / description lines, in the same
 * layout as the gallery (`useProductDetailLayout`): a window-wide square on phones, the square on
 * the left with the lines beside it on tablets.
 */
export function ProductSkeleton() {
  const layout = useProductDetailLayout();
  const barInset = useHeaderBarInset();
  const gutter = { paddingHorizontal: usePageGutter() };
  return (
    <View testID="product-skeleton" style={layout.split ? styles.splitRow : undefined}>
      <Skeleton width={layout.gallerySide} style={styles.square} borderRadius={0} />
      <View style={layout.split ? [styles.body, gutter, styles.splitInfo, { paddingTop: barInset }] : [styles.body, gutter]}>
        <Skeleton height={spacing[8]} width="75%" />
        <Skeleton height={spacing[6]} width="50%" />
        <SkeletonText lines={4} />
      </View>
    </View>
  );
}

/**
 * Tam veri isteyen bölümlerin yer tutucusu: liste önbelleğinden açılan ilk karede (başlık / fiyat /
 * galeri hazır) açıklama + satıcı kartının yerine; `count` kadar kart boyu blok.
 */
export function ProductSectionsSkeleton({ count = 2, testID }: { count?: number; testID?: string }) {
  return (
    <View style={styles.sections} testID={testID}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} height={SECTION_SKELETON_HEIGHT} borderRadius={radiusRole.card} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { padding: spacing[4], gap: spacing[4] },
  square: { aspectRatio: 1, height: undefined },
  splitRow: { flexDirection: 'row', alignItems: 'flex-start' },
  splitInfo: { flex: 1, minWidth: 0 },
  sections: { gap: spacing[4] },
});
