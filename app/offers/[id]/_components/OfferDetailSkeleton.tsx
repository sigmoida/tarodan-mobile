import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  SkeletonBlock,
  SkeletonButton,
  SkeletonKeyValueRow,
  SkeletonLine,
  SkeletonMediaRow,
  SkeletonPage,
  SkeletonSectionCard,
  skeletonLineHeight,
  theme,
} from '@/ui';

const { radius, spacing } = theme;

/**
 * Teklif detayı iskeleti (`PageShell` `loadingFallback`) — ürün kartı, durum bandı, tutar kartı,
 * taraflar kartı ve (satıcı/alıcı için) eylem düğmeleri. Mesaj kartı veriye bağlı olduğu için yok.
 */
export function OfferDetailSkeleton() {
  return (
    <SkeletonPage testID="offer-detail-skeleton">
      <SkeletonSectionCard title={false}>
        <SkeletonMediaRow
          lines={[
            { variant: 'body', width: '85%' },
            { variant: 'bodySm', width: '50%' },
          ]}
        />
      </SkeletonSectionCard>
      {/* Durum bandı: 12 dolgu + tek satır `body`, köşe `radius.lg`. */}
      <SkeletonBlock
        width="100%"
        height={spacing[3] * 2 + skeletonLineHeight('body')}
        borderRadius={radius.lg}
      />
      <SkeletonSectionCard>
        <SkeletonLine variant="h1" width="40%" />
      </SkeletonSectionCard>
      <SkeletonSectionCard title={false}>
        <View style={styles.parties}>
          <SkeletonKeyValueRow />
          <SkeletonKeyValueRow />
          <SkeletonKeyValueRow />
        </View>
      </SkeletonSectionCard>
      <View style={styles.actions}>
        <SkeletonButton />
        <SkeletonButton />
      </View>
    </SkeletonPage>
  );
}

const styles = StyleSheet.create({
  parties: { gap: spacing[2] },
  actions: { gap: spacing[2] },
});
