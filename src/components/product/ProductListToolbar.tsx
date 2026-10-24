import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { theme } from '@/ui';
import { ProductListControls } from './ProductListControls';
import { ActiveFilterChips, type ActiveFilterChip } from './ActiveFilterChips';

const { spacing } = theme;

export interface ProductListToolbarProps {
  /** The search box (if any), at the top. */
  search?: React.ReactNode;
  sortLabel: string;
  onSort: () => void;
  /** Without it there is no "Filters" button (a list without a filter sheet). */
  onFilter?: () => void;
  filterCount?: number;
  layout?: 'grid' | 'list';
  onLayoutChange?: (layout: 'grid' | 'list') => void;
  /** When given, the control row draws the "Save this search" button (search screen). */
  onSave?: () => void;
  /** Nothing to save: the button is disabled. */
  saveDisabled?: boolean;
  chips?: ActiveFilterChip[];
  onClearFilters?: () => void;
  /** A screen-specific extra row (e.g. the category scale chips), below the control row. */
  extra?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * The ONE toolbar of the product lists (listings, search, category...). The order is the same on
 * every screen: search box (if any) -> [Filters (count)] [Sort] ... [grid/list] -> screen-specific
 * extra row -> removable active filter chips + "Clear". No result count text (on any device). Screens never
 * lay out their own toolbar; they only pass data and callbacks.
 */
export function ProductListToolbar({
  search,
  sortLabel,
  onSort,
  onFilter,
  filterCount,
  layout,
  onLayoutChange,
  onSave,
  saveDisabled,
  chips = [],
  onClearFilters,
  extra,
  style,
}: ProductListToolbarProps) {
  return (
    <View style={[styles.root, style]} testID="product-list-toolbar">
      {search}
      <ProductListControls
        sortLabel={sortLabel}
        onSort={onSort}
        onFilter={onFilter}
        filterCount={filterCount}
        layout={layout}
        onLayoutChange={onLayoutChange}
        onSave={onSave}
        saveDisabled={saveDisabled}
      />
      {extra}
      {chips.length > 0 && onClearFilters ? <ActiveFilterChips chips={chips} onClear={onClearFilters} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing[2] },
});
