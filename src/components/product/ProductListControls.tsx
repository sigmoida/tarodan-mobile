import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, IconButton, RawText, theme } from '@/ui';

const { colors, spacing, typography, radius } = theme;

/**
 * Liste başlığındaki denetimler (web `ListingsControls`): "Filtreler" düğmesi (etkin filtre sayısı
 * rozetiyle) ve geçerli sıralamayı gösteren sıralama düğmesi. `onFilter` verilmezse yalnız sıralama
 * çizilir (filtre paneli olmayan kategori ekranı).
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
    <View style={styles.row}>
      {onFilter ? (
        <Button
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
      {layout && onLayoutChange ? (
        <IconButton
          testID="layout-toggle"
          icon={layout === 'grid' ? 'list-bullet' : 'squares-2x2'}
          size="sm"
          variant="ghost"
          accessibilityLabel={layout === 'grid' ? t('product.layoutList') : t('product.layoutGrid')}
          onPress={() => onLayoutChange(layout === 'grid' ? 'list' : 'grid')}
        />
      ) : null}
      <Button
        variant="outline"
        size="sm"
        icon="arrows-up-down"
        title={sortLabel}
        onPress={onSort}
        accessibilityLabel={t('common.sort')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing[2] },
});
