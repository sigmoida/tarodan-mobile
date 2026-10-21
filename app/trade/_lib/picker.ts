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
 * Loading wins over the empty state: `isLoading` only covers the first fetch, so a cached
 * empty list that is being refetched must also read as loading. The empty state shows only
 * after a fetch settles empty. A failed fetch settles too (`isFetching` turns false once the
 * retries end), so the spinner never stays forever.
 */
export function isPickerLoading(query: {
  isLoading: boolean;
  isFetching: boolean;
  data?: readonly unknown[];
}): boolean {
  return query.isLoading || (query.isFetching && !query.data?.length);
}
