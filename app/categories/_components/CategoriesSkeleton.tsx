import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Skeleton, theme } from '@/ui';
import { CATEGORY_RAIL_WIDTH, useCategoryGridColumns } from '../_lib/layout';

const { colors, spacing } = theme;
const RAIL_ITEMS = [0, 1, 2, 3];
const GRID_ROWS = [0, 1, 2, 3];

/** Izgara iskeleti: gerçek ızgarayla aynı sütunlu kutu yer tutucuları (grup yüklenirken sağ alanda da kullanılır). */
export function GridSkeleton() {
  const columns = useCategoryGridColumns();
  return (
    <View style={styles.rows} testID="categories-grid-skeleton">
      {GRID_ROWS.map((r) => (
        <View key={r} style={styles.row}>
          {Array.from({ length: columns }, (_, c) => (
            <View key={c} style={styles.cell}>
              <Skeleton height={spacing[12]} width={spacing[12]} borderRadius={theme.radiusRole.card} />
              <Skeleton height={spacing[3]} width="80%" />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

/** İlk yükleme iskeleti (gösterilecek veri yokken): sol ray (grup satırları) + sağ ızgara (başlık + kutular). */
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
        <GridSkeleton />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', paddingTop: spacing[4] },
  rail: {
    width: CATEGORY_RAIL_WIDTH,
    gap: spacing[2],
    paddingHorizontal: spacing[2],
    backgroundColor: colors.surface.alt,
  },
  grid: { flex: 1, padding: spacing[3], gap: spacing[4] },
  rows: { gap: spacing[4] },
  row: { flexDirection: 'row', gap: spacing[2] },
  cell: { flex: 1, alignItems: 'center', gap: spacing[2] },
});
