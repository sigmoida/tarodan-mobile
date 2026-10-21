import i18n from '@/i18n/config';
import { savedSearchesApi } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api/errorText';
import { savedSearchRefusal } from '@/lib/api/savedSearchRefusal';
import { isSessionEndedError } from '@/lib/api/reauthError';
import { qk, useAppMutation } from '@/lib/query';
import { appAlert, runAfterModalClose, toast } from '@/ui';
import { toCreateSavedSearchInput, type SavedSearchDraft } from '../_lib/savedSearch';

/** `errorCode` of the ban 403; the axios client has already sent the user to `/banned`. */
const USER_BANNED = 'USER_BANNED';
const isBanned = (error: unknown): boolean =>
  (error as { response?: { data?: { errorCode?: unknown } } } | null)?.response?.data?.errorCode === USER_BANNED;

/**
 * Saves the search (`POST /saved-searches`) and owns the feedback; `SaveSearchModal` fires it AFTER it
 * has closed (`src/ui/CLAUDE.md` > iOS modal rule). The two refusals the user can act on are told
 * apart by `errorCode`, never by the status:
 * - 409 `SAVED_SEARCH_DUPLICATE`: an "already saved" toast.
 * - 403 `SAVED_SEARCH_LIMIT`: a neutral alert with the `limit` of the response body, no upgrade
 *   button (digital sales are off on the stores, tarodan-ops ADR 0003).
 * Any other error is a toast with the server message. A banned user or an ended session was already
 * redirected by the axios client, so nothing is added on top.
 */
export function useDoSaveSearch() {
  return useAppMutation(
    ({ draft, name }: { draft: Pick<SavedSearchDraft, 'query' | 'labels'>; name: string }) =>
      savedSearchesApi.create(toCreateSavedSearchInput(draft, name)).then((res) => res.data),
    {
      invalidates: [qk.user.savedSearches],
      success: () => i18n.t('savedSearch.saved'),
      silentError: true,
      onError: (error) => {
        const refusal = savedSearchRefusal(error);
        if (refusal?.kind === 'duplicate') {
          toast(apiErrorMessage(error, i18n.t('server.savedSearch.alreadySaved')));
        } else if (refusal?.kind === 'limit') {
          const message =
            refusal.limit !== null
              ? i18n.t('search.savedLimitReached', { limit: refusal.limit })
              : apiErrorMessage(error, i18n.t('savedSearch.saveFailed'));
          // A fast answer can land while the modal is still closing: wait it out (iOS modal rule).
          runAfterModalClose(() => appAlert(i18n.t('savedSearch.limitTitle'), message));
        } else if (!isBanned(error) && !isSessionEndedError(error)) {
          toast.error(apiErrorMessage(error, i18n.t('savedSearch.saveFailed')));
        }
      },
    },
  );
}
