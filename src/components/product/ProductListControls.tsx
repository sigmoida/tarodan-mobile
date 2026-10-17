import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, IconButton, theme } from '@/ui';

const { spacing } = theme;

/**
 * Liste araç çubuğunun TEK denetim satırı (web `ListingsControls`): solda "Filtreler" (etkin filtre
 * sayısı rozetiyle) ve geçerli sıralamayı gösteren sıralama düğmesi, sağda ızgara/liste anahtarı.
 * Üç denetim de aynı yükseklikte (controlHeight.sm) ve outline stilinde. `onFilter` verilmezse
 * filtre düğmesi çizilmez; `layout` verilmezse anahtar çizilmez. Ekranlar bunu doğrudan değil
 * `ProductListToolbar` üzerinden kullanır.
 */
export function ProductListControls({
  sortLabel,
  onSort,
  onFilter,
  filterCount = 0,
  layout,
  onLayoutChange,
}: {
  sortLabel: string;
  onSort: () => void;
  onFilter?: () => void;
  filterCount?: number;
  /** Verilirse ızgara/liste anahtarı çizilir (web `ProductLayoutSelector`). */
  layout?: 'grid' | 'list';
  onLayoutChange?: (layout: 'grid' | 'list') => void;
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
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[2] },
  start: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing[2], minWidth: 0 },
  sort: { flexShrink: 1 },
});
