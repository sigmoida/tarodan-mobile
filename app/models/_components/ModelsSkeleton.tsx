import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Card,
  SkeletonBlock,
  SkeletonChipTabs,
  SkeletonLine,
  SkeletonPage,
  SkeletonSectionCard,
  gridCellStyle,
  theme,
  useGridColumns,
} from '@/ui';

const { controlHeight, radiusRole, spacing } = theme;

const MODELS_PER_BRAND = 4;
const BRAND_SECTIONS = 2;

/** Model kartı: kare görsel + ad / yıl / ürün sayısı satırları (`ModelsBrandSection` kartı). */
function ModelCardSkeleton({ index, columns }: { index: number; columns: number }) {
  return (
    <Card variant="bordered" padding={0} style={[styles.modelCard, gridCellStyle(index, columns)]}>
      <SkeletonBlock width="100%" borderRadius={0} style={styles.modelImage} />
      <View style={styles.modelBody}>
        <SkeletonLine variant="bodySm" width="70%" />
        <SkeletonLine variant="caption" width="50%" />
        <SkeletonLine variant="caption" width="40%" />
      </View>
    </Card>
  );
}

/**
 * Models skeleton (`PageShell` `loadingFallback`): search field, brand chips and, per brand, a
 * `SectionCard` with the model card grid (same grouped list and column count as the real screen).
 */
export function ModelsSkeleton() {
  const columns = useGridColumns();
  return (
    <SkeletonPage testID="models-skeleton">
      <View style={styles.filters}>
        <SkeletonBlock width="100%" height={controlHeight.md} borderRadius={radiusRole.input} />
        <SkeletonChipTabs count={4} />
      </View>
      {Array.from({ length: BRAND_SECTIONS }, (_, b) => (
        <SkeletonSectionCard key={b} action>
          <View style={styles.grid}>
            {Array.from({ length: MODELS_PER_BRAND }, (_, m) => (
              <ModelCardSkeleton key={m} index={m} columns={columns} />
            ))}
          </View>
        </SkeletonSectionCard>
      ))}
    </SkeletonPage>
  );
}

const styles = StyleSheet.create({
  filters: { gap: spacing[3] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing[3] },
  modelCard: { overflow: 'hidden', borderRadius: radiusRole.productCard },
  modelImage: { height: undefined, aspectRatio: 1 },
  modelBody: { padding: spacing[2.5], gap: spacing[0.5] },
});
