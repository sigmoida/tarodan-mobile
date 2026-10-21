import { useQueryClient } from '@tanstack/react-query';
import i18n from '@/i18n/config';
import { savedSearchesApi } from '@/lib/api';
import { isNotFoundError, qk, useAppMutation } from '@/lib/query';

/**
 * Deletes one saved search (`DELETE /saved-searches/:id`) and refreshes the list. A 404
 * (`server.savedSearch.notFound`) means the row is already gone, for example deleted on another
 * device: the server message is shown and the list is refetched as well, so the stale row leaves the
 * screen instead of failing on every retry.
 */
export function useDoDeleteSavedSearch() {
  const queryClient = useQueryClient();
  return useAppMutation((id: string) => savedSearchesApi.remove(id), {
    invalidates: [qk.user.savedSearches],
    success: () => i18n.t('savedSearch.deleted'),
    error: () => i18n.t('savedSearch.deleteFailed'),
    onError: (error) => {
      if (isNotFoundError(error)) void queryClient.invalidateQueries({ queryKey: qk.user.savedSearches });
    },
  });
}
