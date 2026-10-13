import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Pressable, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Input, Text, theme } from '@/ui';
import { ActiveFilterChips, ProductListControls } from '@/components/product';
import { buildSortOptions } from '@/utils/productFilters';
import { styles } from '../_lib/searchStyles';
import { SearchSuggestions } from './SearchSuggestions';
import type { SearchController } from '../_hooks/useSearch';

const { colors } = theme;

/**
 * Collapsible top bars (absolute layer): search input + suggestions dropdown, filter/sort controls,
 * active filter chips and the results count. Slides up via translateY when the results list scrolls
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
      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchAnchor}>
          <Input
            testID="search-input"
            autoFocus={f.autoFocusSearch}
            placeholder={t('search.placeholderLong')}
            value={f.searchQuery}
            onChangeText={f.handleSearchChange}
            leftIconName="search"
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
                  <Ionicons name="close-circle" size={theme.iconSize.md} color={colors.text.muted} />
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
      </View>

      {/* Filter & Sort */}
      <View style={styles.controls}>
        <ProductListControls
          sortLabel={sortOptions.find((s) => s.value === f.filters.sortBy)?.label || t('common.sort')}
          onSort={() => f.setSortModalVisible(true)}
          onFilter={() => f.setFilterModalVisible(true)}
          filterCount={f.activeFiltersCount}
        />
      </View>

      {/* Active Filter Chips */}
      {f.activeChips.length > 0 && (
        <View style={styles.chips}>
          <ActiveFilterChips chips={f.activeChips} onClear={f.clearAllFilters} />
        </View>
      )}

      {/* Results Count */}
      <View style={styles.resultsCount}>
        <Text variant="bodySm" tone="muted">
          {f.isLoading ? t('search.searching') : t('search.resultsFound', { count: f.total })}
        </Text>
      </View>
    </Animated.View>
  );
}
