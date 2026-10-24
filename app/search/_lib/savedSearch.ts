/**
 * Pure serialiser for "Save this search": turns the live search filters into the
 * `POST /saved-searches` body. It reuses `buildListParams`, so a saved search is exactly the query the
 * results list sends to `GET /products` (web: `listings/_lib/savedSearch.ts`). The canonical form,
 * the empty rule and the default name come from the vendored contract (`@/types`); nothing here
 * duplicates the allow-list.
 */
import {
  canonicalizeSavedSearchLabels,
  canonicalizeSavedSearchQuery,
  isEmptySavedSearchQuery,
  savedSearchDefaultName,
  type CreateSavedSearchInput,
  type SavedSearchLabels,
  type SavedSearchQuery,
} from '@/types';
import { chipName, type ChipNameOptions } from '@/utils/activeFilterChips';
import { buildListParams, type ProductFilters } from '@/utils/productFilters';
import { PAGE_SIZE } from './searchConstants';

export interface SavedSearchDraft {
  /** Canonical query, in `GET /products` form. */
  query: SavedSearchQuery;
  /** Display names of the id-keyed filters (a snapshot at save time). */
  labels: SavedSearchLabels;
  /** True when there is nothing but a sort: such a search cannot be saved. */
  isEmpty: boolean;
  /** The automatic name (may be empty); prefills the name field. */
  defaultName: string;
}

/**
 * The filters carry a display name next to an id when they come from the filter sheet; a deep link
 * may carry the id only, so the name falls back to the loaded option list (same rule as the chips).
 */
export function buildSavedSearchDraft(filters: ProductFilters, names: ChipNameOptions): SavedSearchDraft {
  // page and limit are not part of a search; the shared canonicaliser drops them.
  const query = canonicalizeSavedSearchQuery(buildListParams(filters, 1, PAGE_SIZE));
  const labels = canonicalizeSavedSearchLabels(
    {
      categoryId: chipName(filters.category, filters.categoryId, names.categories, ''),
      brandId: chipName(filters.brand, filters.brandId, names.brands, ''),
      manufacturerId: chipName(filters.manufacturer, filters.manufacturerId, names.manufacturers, ''),
      carModelId: chipName(filters.carModel, filters.carModelId, names.carModels, ''),
    },
    query,
  );
  return {
    query,
    labels,
    isEmpty: isEmptySavedSearchQuery(query),
    defaultName: savedSearchDefaultName(query, labels),
  };
}

/** The request body for a draft; a blank name lets the API derive its own. */
export function toCreateSavedSearchInput(
  draft: Pick<SavedSearchDraft, 'query' | 'labels'>,
  name: string,
): CreateSavedSearchInput {
  const trimmed = name.trim();
  return {
    ...(trimmed ? { name: trimmed } : {}),
    query: { ...draft.query },
    labels: draft.labels,
  };
}
