import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Card, SkeletonAvatar, SkeletonBlock, SkeletonLine, theme } from '@/ui';

const { radiusRole, spacing } = theme;

/**
 * `CollectionCard` iskeleti — kartla AYNI iskelet: kare kapak, gövde (ad, açıklama, sayaç satırı) ve
 * sahip satırı (küçük avatar + ad). Çerçeve `Card bordered`, köşe `radiusRole.productCard`.
 */
export function SkeletonCollectionCard({ style, testID }: { style?: StyleProp<ViewStyle>; testID?: string }) {
  return (
    <Card variant="bordered" padding={0} style={[styles.card, style]} testID={testID}>
      <SkeletonBlock width="100%" borderRadius={0} style={styles.cover} />
      <View style={styles.body}>
        <SkeletonLine variant="bodySm" width="80%" />
        <SkeletonLine variant="caption" width="60%" />
        <View style={styles.meta}>
          <SkeletonLine variant="caption" width="30%" />
          <SkeletonLine variant="caption" width="25%" />
        </View>
      </View>
      <View style={styles.owner}>
        <SkeletonAvatar size="sm" />
        <SkeletonLine variant="caption" width="40%" />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, overflow: 'hidden', borderRadius: radiusRole.productCard },
  cover: { height: undefined, aspectRatio: 1 },
  body: { padding: spacing[2.5], gap: spacing[0.5] },
  meta: { paddingTop: spacing[2], flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  owner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1.5],
  },
});
