import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, RawText, theme } from '@/ui';

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
}: {
  sortLabel: string;
  onSort: () => void;
  onFilter?: () => void;
  filterCount?: number;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.row}>
      {onFilter ? (
        <Button
          variant="outline"
          size="sm"
          icon="funnel-outline"
          title={t('product.filters')}
          onPress={onFilter}
          accessibilityLabel={t('product.filters')}
          rightIcon={
            filterCount > 0 ? (
              <View style={styles.count} testID="filter-count">
                <RawText style={styles.countText}>{filterCount}</RawText>
              </View>
            ) : undefined
          }
        />
      ) : null}
      <Button
        variant="outline"
        size="sm"
        icon="swap-vertical-outline"
        title={sortLabel}
        onPress={onSort}
        accessibilityLabel={t('common.sort')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  // Web: px-1.5 py-0.5 bg-primary-500 text-2xs font-bold rounded-sm.
  count: {
    paddingHorizontal: spacing[1.5],
    paddingVertical: spacing[0.5],
    borderRadius: radius.sm,
    backgroundColor: colors.primary[500],
  },
  countText: {
    fontSize: typography.fontSize['2xs'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.inverted,
  },
});
