import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, SkeletonBlock, SkeletonLine, theme } from '@/ui';
import { THUMB, styles as cardStyles } from '../_lib/styles';

const { radius, spacing } = theme;

const ROWS = 4;

/** Tek favori kartı iskeleti: kartın sol kenarını dolduran kare görsel + satıcı / ürün adı + fiyat satırı. */
function FavoriteCardSkeleton() {
  return (
    <Card variant="bordered" padding={0} style={cardStyles.card}>
      <View style={cardStyles.cardContent}>
        <SkeletonBlock width={THUMB} height={THUMB} borderRadius={0} />
        <View style={cardStyles.productInfo}>
          <View style={cardStyles.titleBlock}>
            <SkeletonLine variant="bodySm" width="45%" />
            <SkeletonLine variant="bodySm" width="85%" />
            <SkeletonLine variant="bodySm" width="60%" />
          </View>
          <View style={cardStyles.bottomRow}>
            <SkeletonLine variant="body" width="30%" />
            <View style={cardStyles.spacer} />
            <SkeletonBlock width={spacing[8]} height={spacing[8]} borderRadius={radius.full} />
            <SkeletonBlock width={spacing[8]} height={spacing[8]} borderRadius={radius.full} />
          </View>
        </View>
      </View>
    </Card>
  );
}

/** Favoriler listesi iskeleti (`ListEmptyComponent`, ilk yükleme) — `FavoriteCard` ile aynı kart dizisi. */
export function FavoritesSkeleton() {
  return (
    <View style={styles.list} testID="favorites-skeleton">
      {Array.from({ length: ROWS }, (_, i) => (
        <FavoriteCardSkeleton key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing[4] },
});
