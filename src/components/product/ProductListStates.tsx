import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, EmptyState, PAGE_GUTTER, gridCellWidth, theme, useGridColumns, type EmptyStatePlacement } from '@/ui';
import type { ProductCardLayout } from './ProductCard';
import { SkeletonProductCard } from './SkeletonProductCard';

const { spacing } = theme;

/** Kart ızgarasının aralığı (web `gap-3`). */
export const PRODUCT_GRID_GAP = spacing[3];

/**
 * Column count of the listing grids (`ProductGrid`, search): 2 on phones, more on tablets
 * (`CARD_GRID_COLUMNS`, from the window width). The list's `key` must include it.
 */
export function useProductGridColumns(): number {
  return useGridColumns();
}

/** A card's width in the listing grid (page gutters and the gaps between `columns` deducted). */
export function productCellWidth(windowWidth: number, columns: number): number {
  return gridCellWidth(windowWidth - PAGE_GUTTER * 2, columns, PRODUCT_GRID_GAP);
}

/** A card's width in the listing grid of the current window. */
export function useProductCellWidth(): number {
  const { width } = useWindowDimensions();
  return productCellWidth(width, useProductGridColumns());
}

/**
 * Yükleniyor — gerçek ızgarayla AYNI yerleşim: hücre genişliği `useProductCellWidth`, aralık
 * `PRODUCT_GRID_GAP`, her hücre `SkeletonProductCard` (kartın kendi geometrisi). Izgara
 * `useProductGridColumns` sütun (varsayılan üç satır), liste tek sütun. Liste/kart ekranlarında
 * tam ekran spinner yerine bu kullanılır.
 */
export function ProductGridSkeleton({
  count,
  layout = 'grid',
  showMeta = true,
}: {
  count?: number;
  layout?: ProductCardLayout;
  showMeta?: boolean;
}) {
  const cellWidth = useProductCellWidth();
  const columns = useProductGridColumns();
  const cells = count ?? columns * 3;
  const items = Array.from({ length: layout === 'list' ? Math.min(cells, 4) : cells });
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
 * The ONE empty state of product lists (web `ListingsGrid` empty): "No listings yet" plus, when
 * filtered, "Try adjusting your filters" and a clear button; otherwise an invitation to list the
 * first item. `placement` follows the host list (`list` in `ProductGrid` on the page gutter).
 */
export function ProductListEmpty({
  filtered = false,
  onClearFilters,
  placement,
}: {
  filtered?: boolean;
  onClearFilters?: () => void;
  placement?: EmptyStatePlacement;
}) {
  const { t } = useTranslation();
  return (
    <EmptyState
      placement={placement}
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
