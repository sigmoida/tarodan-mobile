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

/**
 * The stricter rule of the counter-offer pickers (web `useCounterOfferEditor`: loading while
 * `dataUpdatedAt < openedAt`): loading until this open's own fetch settles, even over a cached
 * non-empty list, so an older open's list is not pickable while the fresh one loads. The counter
 * screen is its own route, so an open is a mount and `isFetchedAfterMount` marks the first
 * settled fetch of this open. A failed one settles too, so the spinner never stays; then the
 * cached list shows, as on web. Later background refetches (focus, foreground,
 * pull-to-refresh, "Show more") keep the list on screen.
 */
export function isPickerLoadingUntilFresh(query: {
  isLoading: boolean;
  isFetching: boolean;
  isFetchedAfterMount: boolean;
}): boolean {
  return query.isLoading || (query.isFetching && !query.isFetchedAfterMount);
}

/**
 * The first load failed and nothing is loaded (web: `isError && !isFetching && !data`). A failed
 * background refetch or "Show more" keeps the loaded pages, so it is not a load failure
 * (`isError` is set then too, hence the `data` check); a retry in flight is not one either.
 */
export function isPickerLoadFailed(query: { isError: boolean; isFetching: boolean; data?: unknown }): boolean {
  return query.isError && !query.isFetching && !query.data;
}

/** Page size of the paged trade pickers ("Show more" loads this many). */
export const TRADE_PICKER_PAGE_SIZE = 20;
