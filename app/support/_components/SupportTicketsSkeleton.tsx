import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SkeletonBlock, SkeletonLine, theme } from '@/ui';

const { iconSize, radius, spacing } = theme;

const ROWS = 3;

/**
 * Destek talepleri satırları iskeleti (`SectionCard` gövdesinde): her satır #numara + durum rozeti,
 * konu satırı, kategori · tarih satırı ve sağda chevron kutusu — `TicketRow` geometrisi.
 */
export function SupportTicketsSkeleton() {
  return (
    <View testID="support-skeleton">
      {Array.from({ length: ROWS }, (_, i) => (
        <View key={i} style={styles.row}>
          <View style={styles.rowMain}>
            <View style={styles.rowMeta}>
              <SkeletonLine variant="caption" width="22%" />
              <SkeletonBlock width={spacing[16]} height={spacing[5]} borderRadius={radius.full} />
            </View>
            <SkeletonLine variant="label" width="75%" />
            <SkeletonLine variant="caption" width="45%" />
          </View>
          <SkeletonBlock width={iconSize.md} height={iconSize.md} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingVertical: spacing[3] },
  rowMain: { flex: 1, gap: spacing[1] },
  rowMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
