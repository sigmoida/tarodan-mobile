import { SAVED_SEARCH_ERROR_CODES } from '@/types';

/** Why `POST /saved-searches` refused, for the two refusals the user can act on. */
export type SavedSearchRefusal = { kind: 'duplicate' } | { kind: 'limit'; limit: number | null };

type RefusalShape = { response?: { data?: { errorCode?: unknown; limit?: unknown } } } | null | undefined;

/**
 * Reads the refusal by `errorCode`, never by the status alone (a 403 can also be `USER_BANNED` or
 * `server.auth.accountDeleted`). `limit` is the top-level number of the 403 `SAVED_SEARCH_LIMIT`
 * body: always show that one, not a cached limit. Any other error is `null`.
 */
export function savedSearchRefusal(error: unknown): SavedSearchRefusal | null {
  const data = (error as RefusalShape)?.response?.data;
  if (data?.errorCode === SAVED_SEARCH_ERROR_CODES.duplicate) return { kind: 'duplicate' };
  if (data?.errorCode === SAVED_SEARCH_ERROR_CODES.limitReached) {
    return { kind: 'limit', limit: typeof data.limit === 'number' ? data.limit : null };
  }
  return null;
}
