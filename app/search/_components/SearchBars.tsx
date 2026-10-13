import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { ProductListToolbar } from '@/components/product';
import { buildSortOptions } from '@/utils/productFilters';
import { styles } from '../_lib/searchStyles';
import { SearchInputBox, type SearchInputBoxProps } from './SearchInputBox';
import { SearchSuggestions, type SearchSuggestionsProps } from './SearchSuggestions';
import type { SearchController } from '../_hooks/useSearch';

export interface SearchBarsProps
  extends Omit<SearchInputBoxProps, 'initialValue' | 'command' | 'onEmptyChange'>,
    SearchSuggestionsProps {
  translateY: SharedValue<number>;
  onBarsLayout: (e: LayoutChangeEvent) => void;
  initialQuery: string;
  inputCommand: SearchInputBoxProps['command'];
  onInputEmptyChange: SearchInputBoxProps['onEmptyChange'];
  sortBy: string;
  onSort: () => void;
  onFilter: () => void;
  filterCount: number;
  layout: 'grid' | 'list';
  onLayoutChange: (layout: 'grid' | 'list') => void;
  isLoading: boolean;
  total: number;
  chips: SearchController['activeChips'];
  onClearFilters: () => void;
}

/**
 * Collapsible top bars (absolute layer): the shared `ProductListToolbar` (search input + suggestions
 * dropdown, filter/sort/layout controls, results count, active filter chips). Slides up via translateY when the results list scrolls
 * down. Tek tek prop alır + `React.memo`: ekranın alakasız render'ları çubukları yeniden çizmez.
 */
function SearchBarsBase({
  translateY,
  onBarsLayout,
  initialQuery,
  inputCommand,
  onInputEmptyChange,
  autoFocus,
  suggestionsOpen,
  onCommit,
  onSubmit,
  onClose,
  onFocus,
  onBlur,
  sortBy,
  onSort,
  onFilter,
  filterCount,
  layout,
  onLayoutChange,
  isLoading,
  total,
  chips,
  onClearFilters,
  ...suggestionProps
}: SearchBarsProps) {
  const { t } = useTranslation();
  const sortOptions = useMemo(() => buildSortOptions(t), [t]);
  const slideStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const barsStyle = useMemo(() => [styles.collapsibleBars, slideStyle], [slideStyle]);
  return (
    <Animated.View testID="search-collapsible-bars" style={barsStyle} onLayout={onBarsLayout}>
      <ProductListToolbar
        style={styles.toolbar}
        search={
          <View style={styles.searchAnchor}>
            <SearchInputBox
              initialValue={initialQuery}
              command={inputCommand}
              autoFocus={autoFocus}
              suggestionsOpen={suggestionsOpen}
              onCommit={onCommit}
              onEmptyChange={onInputEmptyChange}
              onSubmit={onSubmit}
              onClose={onClose}
              onFocus={onFocus}
              onBlur={onBlur}
            />

            <SearchSuggestions {...suggestionProps} />
          </View>
        }
        sortLabel={sortOptions.find((s) => s.value === sortBy)?.label || t('common.sort')}
        onSort={onSort}
        onFilter={onFilter}
        filterCount={filterCount}
        layout={layout}
        onLayoutChange={onLayoutChange}
        resultLabel={isLoading ? t('search.searching') : t('search.resultsFound', { count: total })}
        chips={chips}
        onClearFilters={onClearFilters}
      />
    </Animated.View>
  );
}

export const SearchBars = React.memo(SearchBarsBase);
