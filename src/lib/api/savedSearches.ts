import type { CreateSavedSearchInput, PaginationMeta, SavedSearch } from '@/types';
import { api } from './client';
import { apiPath } from './path';

/** `GET /saved-searches` answer: the caller's rows, newest first, with the pagination meta. */
export interface SavedSearchPage {
  data: SavedSearch[];
  meta: PaginationMeta;
}

/**
 * Saved searches (contract: tarodan-ops `contracts/deltas/2026-10-21-saved-searches.md`).
 * `create` refuses with 409 `SAVED_SEARCH_DUPLICATE` and 403 `SAVED_SEARCH_LIMIT` (top-level
 * `limit`); tell the refusals apart by `errorCode`, never by the status alone.
 */
export const savedSearchesApi = {
  /** The API caps `limit` at 100; page with `meta.totalPages` for more. */
  list: (page = 1, limit = 100) => api.get<SavedSearchPage>('/saved-searches', { params: { page, limit } }),
  create: (input: CreateSavedSearchInput) => api.post<SavedSearch>('/saved-searches', input),
  remove: (id: string) => api.delete(apiPath`/saved-searches/${id}`),
};
