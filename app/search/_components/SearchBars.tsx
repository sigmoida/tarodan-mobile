import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Pressable, Animated } from 'react-native';
import { Input, theme, Icon } from '@/ui';
import { ProductListToolbar } from '@/components/product';
import { buildSortOptions } from '@/utils/productFilters';
import { styles } from '../_lib/searchStyles';
import { SearchSuggestions } from './SearchSuggestions';
import type { SearchController } from '../_hooks/useSearch';

const { colors } = theme;

/**
 * Collapsible top bars (absolute layer): the shared `ProductListToolbar` (search input + suggestions
 * dropdown, filter/sort/layout controls, results count, active filter chips). Slides up via translateY when the results list scrolls
 * down.
 */
export function SearchBars({ f }: { f: SearchController }) {
  const { t } = useTranslation();
  const sortOptions = useMemo(() => buildSortOptions(t), [t]);
  return (
    <Animated.View
      testID="search-collapsible-bars"
      style={[styles.collapsibleBars, { transform: [{ translateY: f.barsTranslateY }] }]}
      onLayout={f.onBarsLayout}
    >
      <ProductListToolbar
        style={styles.toolbar}
        search={
          <View style={styles.searchAnchor}>
            <Input
              testID="search-input"
              autoFocus={f.autoFocusSearch}
              placeholder={t('search.placeholderLong')}
              value={f.searchQuery}
              onChangeText={f.handleSearchChange}
              leftIconName="magnifying-glass"
              containerStyle={styles.searchInputContainer}
              fieldStyle={[styles.searchInputField, f.suggestionsOpen && styles.searchInputFieldOpen]}
              rightIcon={
                f.suggestionsOpen ? (
                  <Pressable
                    onPress={f.closeSuggestions}
                    hitSlop={theme.spacing[3]}
                    accessibilityRole="button"
                    accessibilityLabel={t('common.close')}
                  >
                    <Icon name="x-circle" variant="solid" size={theme.iconSize.md} color={colors.text.muted} />
                  </Pressable>
                ) : undefined
              }
              onFocus={() => {
                f.setShowRecentSearches(true);
                f.setAutocompleteOpen(true);
              }}
              onBlur={() => {
                setTimeout(() => {
                  f.setShowRecentSearches(false);
                  f.setAutocompleteOpen(false);
                }, 200);
              }}
            />

            <SearchSuggestions f={f} />
          </View>
        }
        sortLabel={sortOptions.find((s) => s.value === f.filters.sortBy)?.label || t('common.sort')}
        onSort={() => f.setSortModalVisible(true)}
        onFilter={() => f.setFilterModalVisible(true)}
        filterCount={f.activeFiltersCount}
        layout={f.layout}
        onLayoutChange={f.setLayout}
        resultLabel={f.isLoading ? t('search.searching') : t('search.resultsFound', { count: f.total })}
        chips={f.activeChips}
        onClearFilters={f.clearAllFilters}
      />
    </Animated.View>
  );
}
