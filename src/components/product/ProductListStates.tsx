import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, EmptyState, PAGE_GUTTER, theme } from '@/ui';
import type { ProductCardLayout } from './ProductCard';
import { SkeletonProductCard } from './SkeletonProductCard';

const { spacing } = theme;

/** Kart ızgarasının aralığı (web `gap-3`). */
export const PRODUCT_GRID_GAP = spacing[3];

/** İki sütunlu ızgarada bir kartın genişliği (sayfa kenar boşluğu ve aralık düşülmüş). */
export function useProductCellWidth(): number {
  const { width } = useWindowDimensions();
  return (width - PAGE_GUTTER * 2 - PRODUCT_GRID_GAP) / 2;
}

/**
 * Yükleniyor — gerçek ızgarayla AYNI yerleşim: hücre genişliği `useProductCellWidth`, aralık
 * `PRODUCT_GRID_GAP`, her hücre `SkeletonProductCard` (kartın kendi geometrisi). Izgara 2 sütun,
 * liste tek sütun. Liste/kart ekranlarında tam ekran spinner yerine bu kullanılır.
 */
export function ProductGridSkeleton({
  count = 6,
  layout = 'grid',
  showMeta = true,
}: {
  count?: number;
  layout?: ProductCardLayout;
  showMeta?: boolean;
}) {
  const cellWidth = useProductCellWidth();
  const items = Array.from({ length: layout === 'list' ? Math.min(count, 4) : count });
  return (
    <View style={layout === 'list' ? styles.list : styles.grid} testID="product-grid-skeleton">
      {items.map((_, i) => (
        <SkeletonProductCard
          key={i}
          layout={layout}
          showMeta={showMeta}
          style={layout === 'list' ? undefined : { width: cellWidth, flex: 0 }}
        />
      ))}
    </View>
  );
}

/**
 * Ürün listelerinin TEK boş durumu (web `ListingsGrid` boş hali): "Henüz ilan yok" + filtre varsa
 * "Filtrelerinizi değiştirmeyi deneyin" ve temizle düğmesi; filtre yoksa ilk ilanı vermeye davet.
 */
export function ProductListEmpty({
  filtered = false,
  onClearFilters,
}: {
  filtered?: boolean;
  onClearFilters?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <EmptyState
      icon="magnifying-glass"
      title={t('product.noListings')}
      subtitle={filtered ? t('product.tryAdjustingFilters') : t('home.beTheFirst')}
      action={
        filtered && onClearFilters ? (
          <Button variant="primary" title={t('product.clearFilters')} onPress={onClearFilters} />
        ) : undefined
      }
    />
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: PRODUCT_GRID_GAP },
  list: { gap: PRODUCT_GRID_GAP },
});
