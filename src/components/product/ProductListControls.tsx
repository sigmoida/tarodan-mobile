import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, IconButton, theme } from '@/ui';

const { spacing } = theme;

/**
 * The ONE control row of the list toolbar (web `ListingsControls`): on the left "Filters" (with the
 * active filter count badge) and the sort button showing the current sort, on the right the
 * grid/list toggle. Every control has the same height (controlHeight.sm) and the outline style.
 * Without `onFilter` there is no filter button; without `layout` there is no toggle. With `onSave`
 * a "Save this search" button shows on the right (web `ListingsToolbar`; icon only at phone width).
 * Screens use it through `ProductListToolbar`, never directly.
 */
export function ProductListControls({
  sortLabel,
  onSort,
  onFilter,
  filterCount = 0,
  layout,
  onLayoutChange,
  onSave,
  saveDisabled = false,
}: {
  sortLabel: string;
  onSort: () => void;
  onFilter?: () => void;
  filterCount?: number;
  /** Verilirse ızgara/liste anahtarı çizilir (web `ProductLayoutSelector`). */
  layout?: 'grid' | 'list';
  onLayoutChange?: (layout: 'grid' | 'list') => void;
  /** When given, the "Save this search" icon button is drawn. */
  onSave?: () => void;
  /** Nothing to save (an empty search): the button is disabled and its accessibility hint says why. */
  saveDisabled?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.row} testID="product-list-controls">
      <View style={styles.start}>
        {onFilter ? (
          <Button
            testID="filter-button"
            variant="outline"
            size="sm"
            icon="funnel"
            title={t('product.filters')}
            onPress={onFilter}
            accessibilityLabel={t('product.filters')}
            count={filterCount}
            countTestID="filter-count"
          />
        ) : null}
        <Button
          testID="sort-button"
          variant="outline"
          size="sm"
          icon="arrows-up-down"
          title={sortLabel}
          onPress={onSort}
          accessibilityLabel={t('common.sort')}
          style={styles.sort}
        />
      </View>
      {onSave || (layout && onLayoutChange) ? (
        <View style={styles.end}>
          {onSave ? (
            <IconButton
              testID="save-search-button"
              icon="bookmark"
              size="sm"
              variant="outline"
              disabled={saveDisabled}
              accessibilityLabel={t('savedSearch.save')}
              accessibilityHint={saveDisabled ? t('savedSearch.nothingToSave') : undefined}
              onPress={onSave}
            />
          ) : null}
          {layout && onLayoutChange ? (
            <IconButton
              testID="layout-toggle"
              icon={layout === 'grid' ? 'list-bullet' : 'squares-2x2'}
              size="sm"
              variant="outline"
              accessibilityLabel={layout === 'grid' ? t('product.layoutList') : t('product.layoutGrid')}
              onPress={() => onLayoutChange(layout === 'grid' ? 'list' : 'grid')}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[2] },
  start: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing[2], minWidth: 0 },
  sort: { flexShrink: 1 },
  end: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
});
