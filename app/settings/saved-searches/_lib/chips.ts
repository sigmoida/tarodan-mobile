import type { TFunction } from 'i18next';
import { savedSearchToRouteParams, type SavedSearch } from '@/types';
import { buildActiveChips, type ChipNameOptions } from '@/utils/activeFilterChips';
import { filtersFromSearchParams } from '@/utils/productFilters';

/** The chips are only read: removing one is not offered here. */
const KEEP_FILTERS = (): void => undefined;

/**
 * Summary chips of a saved search, read from its canonical `query` and the display-name `labels`
 * snapshot (ids never reach the user; web `saved-searches/_lib/chips.ts`). The saved search is turned
 * into the filters `/search` opens with (the same `savedSearchToRouteParams` Run uses), and the
 * chips are the ones the search screen shows for those filters (`buildActiveChips`, the one source of
 * the chip labels); only the free text is added in front. `names.colors` names the colour chips (a
 * slug shows until the catalog loads).
 */
export function savedSearchChips(
  { query, labels }: Pick<SavedSearch, 'query' | 'labels'>,
  t: TFunction,
  names: ChipNameOptions = {},
): string[] {
  const filters = filtersFromSearchParams(savedSearchToRouteParams(query, labels));
  const chips = buildActiveChips(filters, KEEP_FILTERS, t, [], names).map((chip) => chip.label);
  if (query.search) chips.unshift(`${t('common.search')}: "${query.search}"`);
  return chips;
}
