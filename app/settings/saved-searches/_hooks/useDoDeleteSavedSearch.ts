import i18n from '@/i18n/config';
import { savedSearchesApi } from '@/lib/api';
import { qk, useAppMutation } from '@/lib/query';

/** Deletes one saved search (`DELETE /saved-searches/:id`) and refreshes the list. */
export function useDoDeleteSavedSearch() {
  return useAppMutation((id: string) => savedSearchesApi.remove(id), {
    invalidates: [qk.user.savedSearches],
    success: () => i18n.t('savedSearch.deleted'),
    error: () => i18n.t('savedSearch.deleteFailed'),
  });
}
