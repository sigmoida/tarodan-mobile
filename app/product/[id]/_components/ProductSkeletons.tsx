import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Skeleton, SkeletonText, theme } from '@/ui';

const { spacing, radiusRole } = theme;

/** Bölüm kartı iskeletinin yüksekliği (pt) — açıklama / satıcı / özellik kartlarının ortalama boyu. */
const SECTION_SKELETON_HEIGHT = spacing[24] + spacing[12];

/** Web ürün detayının yüklenirken iskeleti: kare görsel + başlık/fiyat/açıklama satırları. */
export function ProductSkeleton() {
  return (
    <View testID="product-skeleton">
      <Skeleton width="100%" style={styles.square} borderRadius={0} />
      <View style={styles.body}>
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
  sections: { gap: spacing[4] },
});
