import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { usePageGutter } from '@/ui';
import { ProductListToolbar } from '@/components/product';
import { buildSortOptions } from '@/utils/productFilters';
import { styles } from '../_lib/searchStyles';
import type { SearchController } from '../_hooks/useSearch';

export interface SearchBarsProps {
  translateY: SharedValue<number>;
  onBarsLayout: (e: LayoutChangeEvent) => void;
  sortBy: string;
  onSort: () => void;
  onFilter: () => void;
  filterCount: number;
  layout: 'grid' | 'list';
  onLayoutChange: (layout: 'grid' | 'list') => void;
  /** "Save this search" (web `ListingsToolbar`); `saveDisabled` = an empty search, nothing to save. */
  onSave: () => void;
  saveDisabled: boolean;
  chips: SearchController['activeChips'];
  onClearFilters: () => void;
}

/**
 * Collapsible top bars (absolute layer): the shared `ProductListToolbar` (filter/sort/layout controls,
 * active filter chips). No result count and no page title above it, on every device. Arama alanı artık üst barda (`SearchInputBox`, PageShell
 * `titleSlot`), öneri paneli ayrı katmanda. Slides up via translateY when the results list scrolls
 * down. Tek tek prop alır + `React.memo`: ekranın alakasız render'ları çubukları yeniden çizmez.
 */
function SearchBarsBase({
  translateY,
  onBarsLayout,
  sortBy,
  onSort,
  onFilter,
  filterCount,
  layout,
  onLayoutChange,
  onSave,
  saveDisabled,
  chips,
  onClearFilters,
}: SearchBarsProps) {
  const { t } = useTranslation();
  const sortOptions = useMemo(() => buildSortOptions(t), [t]);
  const slideStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const barsStyle = useMemo(() => [styles.collapsibleBars, slideStyle], [slideStyle]);
  // The toolbar sits at the page gutter, like the results below (wider on tablets).
  const gutter = usePageGutter();
  return (
    <Animated.View testID="search-collapsible-bars" style={barsStyle} onLayout={onBarsLayout}>
      <ProductListToolbar
        style={[styles.toolbar, { paddingHorizontal: gutter }]}
        sortLabel={sortOptions.find((s) => s.value === sortBy)?.label || t('common.sort')}
        onSort={onSort}
        onFilter={onFilter}
        filterCount={filterCount}
        layout={layout}
        onLayoutChange={onLayoutChange}
        onSave={onSave}
        saveDisabled={saveDisabled}
        chips={chips}
        onClearFilters={onClearFilters}
      />
    </Animated.View>
  );
}

export const SearchBars = React.memo(SearchBarsBase);
