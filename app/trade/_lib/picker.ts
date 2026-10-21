/**
 * Shared rules for the trade pickers (new trade and counter offer, both sides).
 * One source: both screens read it, so they cannot drift apart.
 */

/**
 * The pickers list listings that change outside the screen: the user's own (approved, edited
 * or deactivated while the app runs, often with no client mutation, e.g. an admin approval)
 * and the other party's (a new or newly trade-enabled listing the user just tapped "trade"
 * on). The global 5 min `staleTime` would serve a cached, often empty or incomplete, list,
 * so every picker refetches each time it opens.
 */
export const TRADE_PICKER_QUERY_OPTIONS = {
  staleTime: 0,
  refetchOnMount: 'always',
} as const;

/**
 * Loading wins over the empty state until this screen's own fetch settles: `isLoading` only
 * covers the very first fetch, so a cached empty list that is refetched on open must also read
 * as loading. Once a fetch settled after mount (`isFetchedAfterMount`, true for a failed fetch
 * too), later background refetches (focus, foreground, pull-to-refresh) keep the settled
 * state on screen instead of flashing a spinner, and the spinner never stays forever.
 */
export function isPickerLoading(query: {
  isLoading: boolean;
  isFetching: boolean;
  isFetchedAfterMount: boolean;
  data?: readonly unknown[];
}): boolean {
  return query.isLoading || (query.isFetching && !query.isFetchedAfterMount && !query.data?.length);
}
