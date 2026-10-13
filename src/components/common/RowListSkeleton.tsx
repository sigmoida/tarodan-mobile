import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SkeletonAvatar, SkeletonText, theme } from '@/ui';

const { spacing } = theme;

/**
 * Satır listeleri (adres, engellenen, bildirim…) için yükleniyor iskeleti — avatar + iki satır
 * metin, `PageShell` `loadingFallback`'i olarak kullanılır (liste ekranlarında spinner yok).
 */
export const RowListSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <View style={styles.list} testID="row-list-skeleton">
    {Array.from({ length: rows }, (_, i) => (
      <View key={i} style={styles.row}>
        <SkeletonAvatar />
        <View style={styles.text}>
          <SkeletonText lines={2} />
        </View>
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  list: { padding: spacing[4], gap: spacing[4] },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  text: { flex: 1 },
});

export default RowListSkeleton;
