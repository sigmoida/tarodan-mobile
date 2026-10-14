import { ChipTabs } from '@/ui';
import { SALE_FILTERS, useStatusLabel } from '../_lib/status';
import type { FilterType } from '../_lib/types';

/** Yatay durum-filtre sekmeleri (web Tabs karşılığı). */
export function SalesFilterChips({
  filter,
  onSelect,
}: {
  filter: FilterType;
  onSelect: (f: FilterType) => void;
}) {
  const getStatusLabel = useStatusLabel();
  return (
    <ChipTabs
      testID="sales-filters"
      value={filter}
      onChange={onSelect}
      items={SALE_FILTERS.map((f) => ({ key: f, label: getStatusLabel(f) }))}
    />
  );
}
