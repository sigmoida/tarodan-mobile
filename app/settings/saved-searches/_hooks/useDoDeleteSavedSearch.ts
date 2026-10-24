import i18n from '@/i18n/config';
import { savedSearchesApi } from '@/lib/api';
import { isNotFoundError, qk, useAppMutation } from '@/lib/query';

/**
 * `DELETE /saved-searches/:id`. A 404 (`server.savedSearch.notFound`) means the row is already gone,
 * for example deleted on another device: what the user asked for is done, so it counts as a success
 * (same rule as `useFavorites`) and the list is refreshed instead of the stale row failing on every
 * retry.
 */
const removeSavedSearch = (id: string): Promise<void> =>
  savedSearchesApi.remove(id).then(
    () => undefined,
    (error: unknown) => {
      if (isNotFoundError(error)) return undefined;
      throw error;
    },
  );

/** Deletes one saved search and refreshes the list. */
export function useDoDeleteSavedSearch() {
  return useAppMutation(removeSavedSearch, {
    invalidates: [qk.user.savedSearches],
    success: () => i18n.t('savedSearch.deleted'),
    error: () => i18n.t('savedSearch.deleteFailed'),
  });
}
