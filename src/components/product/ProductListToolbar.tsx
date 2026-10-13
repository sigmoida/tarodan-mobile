import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text, theme } from '@/ui';
import { ProductListControls } from './ProductListControls';
import { ActiveFilterChips, type ActiveFilterChip } from './ActiveFilterChips';

const { spacing } = theme;

export interface ProductListToolbarProps {
  /** Arama kutusu (varsa) — en üstte. */
  search?: React.ReactNode;
  sortLabel: string;
  onSort: () => void;
  /** Verilmezse "Filtreler" düğmesi çizilmez (filtre paneli olmayan liste). */
  onFilter?: () => void;
  filterCount?: number;
  layout?: 'grid' | 'list';
  onLayoutChange?: (layout: 'grid' | 'list') => void;
  /** Küçük muted sonuç sayısı metni ("61 ilan"); verilmezse çizilmez. */
  resultLabel?: string;
  chips?: ActiveFilterChip[];
  onClearFilters?: () => void;
  /** Ekrana özgü ek satır (ör. kategori ölçek çipleri) — denetim satırının altında. */
  extra?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Ürün listelerinin TEK araç çubuğu (listings, arama, kategori…). Sıra her ekranda aynı:
 * arama kutusu (varsa) → [Filtreler (sayaç)] [Sıralama] … [ızgara/liste] → ekrana özgü ek satır →
 * küçük muted sonuç sayısı → kaldırılabilir aktif filtre çipleri + "Temizle". Ekranlar kendi
 * araç çubuğunu dizmez; yalnız veri/geri çağrıları geçer.
 */
export function ProductListToolbar({
  search,
  sortLabel,
  onSort,
  onFilter,
  filterCount,
  layout,
  onLayoutChange,
  resultLabel,
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
      />
      {extra}
      {resultLabel ? (
        <Text variant="caption" tone="muted" testID="result-count">
          {resultLabel}
        </Text>
      ) : null}
      {chips.length > 0 && onClearFilters ? <ActiveFilterChips chips={chips} onClear={onClearFilters} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing[2] },
});
