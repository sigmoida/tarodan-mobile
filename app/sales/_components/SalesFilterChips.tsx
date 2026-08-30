import { View, ScrollView } from 'react-native';
import { Chip } from '@/ui';
import { styles } from '../_lib/styles';
import { SALE_FILTERS, useStatusLabel } from '../_lib/status';
import type { FilterType } from '../_lib/types';

/** Yatay durum-filtre çipleri (bounded liste → ScrollView kabul edilir). */
export function SalesFilterChips({
  filter,
  onSelect,
}: {
  filter: FilterType;
  onSelect: (f: FilterType) => void;
}) {
  const getStatusLabel = useStatusLabel();
  return (
    <View style={styles.filterContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {SALE_FILTERS.map((f) => (
          <Chip
            key={f}
            label={getStatusLabel(f)}
            selected={filter === f}
            variant="primary"
            onPress={() => onSelect(f)}
            style={styles.filterChip}
          />
        ))}
      </ScrollView>
    </View>
  );
}
