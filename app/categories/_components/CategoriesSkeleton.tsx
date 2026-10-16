import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Skeleton, theme } from '@/ui';
import { CATEGORY_GRID_COLUMNS } from './CategoryGrid';

const { colors, spacing } = theme;
const RAIL_ITEMS = [0, 1, 2, 3];
const GRID_ROWS = [0, 1, 2, 3];

/** İlk yükleme iskeleti: sol ray (grup satırları) + sağ ızgara (başlık + 3 sütun kutu). */
export function CategoriesSkeleton() {
  return (
    <View style={styles.root} testID="categories-skeleton">
      <View style={styles.rail}>
        {RAIL_ITEMS.map((i) => (
          <Skeleton key={i} height={theme.minTouchTarget} width="100%" />
        ))}
      </View>
      <View style={styles.grid}>
        <Skeleton height={spacing[6]} width="50%" />
        {GRID_ROWS.map((r) => (
          <View key={r} style={styles.row}>
            {Array.from({ length: CATEGORY_GRID_COLUMNS }, (_, c) => (
              <View key={c} style={styles.cell}>
                <Skeleton height={spacing[12]} width={spacing[12]} borderRadius={theme.radiusRole.card} />
                <Skeleton height={spacing[3]} width="80%" />
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', paddingTop: spacing[4] },
  rail: {
    width: '30%',
    gap: spacing[2],
    paddingHorizontal: spacing[2],
    backgroundColor: colors.surface.alt,
  },
  grid: { flex: 1, padding: spacing[3], gap: spacing[4] },
  row: { flexDirection: 'row', gap: spacing[1] },
  cell: { flex: 1, alignItems: 'center', gap: spacing[2] },
});
