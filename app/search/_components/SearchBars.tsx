import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { Text } from '@/ui';
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
  isLoading: boolean;
  total: number;
  chips: SearchController['activeChips'];
  onClearFilters: () => void;
  /** Vitrin girişi bağlamı ("Takas vitrini", "Popüler ilanlar"…); null → çizilmez. */
  contextLabel?: string | null;
}

/**
 * Collapsible top bars (absolute layer): the shared `ProductListToolbar` (filter/sort/layout controls,
 * results count, active filter chips). Arama alanı artık üst barda (`SearchInputBox`, PageShell
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
  isLoading,
  total,
  chips,
  onClearFilters,
  contextLabel,
}: SearchBarsProps) {
  const { t } = useTranslation();
  const sortOptions = useMemo(() => buildSortOptions(t), [t]);
  const slideStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const barsStyle = useMemo(() => [styles.collapsibleBars, slideStyle], [slideStyle]);
  return (
    <Animated.View testID="search-collapsible-bars" style={barsStyle} onLayout={onBarsLayout}>
      {/* Web `/listings` sayfa başlığının karşılığı — yalnız vitrin ön ayarı aynen etkinken. */}
      {contextLabel ? (
        <Text
          variant="h3"
          weight="bold"
          numberOfLines={1}
          accessibilityRole="header"
          style={styles.contextTitle}
          testID="search-context-title"
        >
          {contextLabel}
        </Text>
      ) : null}
      <ProductListToolbar
        style={styles.toolbar}
        sortLabel={sortOptions.find((s) => s.value === sortBy)?.label || t('common.sort')}
        onSort={onSort}
        onFilter={onFilter}
        filterCount={filterCount}
        layout={layout}
        onLayoutChange={onLayoutChange}
        onSave={onSave}
        saveDisabled={saveDisabled}
        resultLabel={isLoading ? t('search.searching') : t('search.resultsFound', { count: total })}
        chips={chips}
        onClearFilters={onClearFilters}
      />
    </Animated.View>
  );
}

export const SearchBars = React.memo(SearchBarsBase);
