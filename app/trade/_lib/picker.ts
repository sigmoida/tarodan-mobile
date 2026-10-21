/**
 * Shared rules for the "my listings" trade pickers (new trade and counter offer).
 * One source: both screens read it, so they cannot drift apart.
 */

/**
 * The picker lists the user's own listings, which change outside the screen (a listing is
 * approved, edited or deactivated while the app runs). The global 5 min `staleTime` would
 * serve a cached - often empty - list, so the picker refetches every time it opens.
 */
export const TRADE_PICKER_QUERY_OPTIONS = {
  staleTime: 0,
  refetchOnMount: 'always',
} as const;

/**
 * Loading wins over the empty state: `isLoading` only covers the first fetch, so a cached
 * empty list that is being refetched must also read as loading. The empty state shows only
 * after a fetch returns empty.
 */
export function isPickerLoading(query: {
  isLoading: boolean;
  isFetching: boolean;
  data?: readonly unknown[];
}): boolean {
  return query.isLoading || (query.isFetching && !query.data?.length);
}
