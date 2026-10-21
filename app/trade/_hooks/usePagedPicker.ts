import { useCallback, useMemo } from 'react';
import { useInfiniteQuery, type QueryKey } from '@tanstack/react-query';
import { nextPageFromInfo, readPageInfo, flattenPagesUnique, type PageInfo } from '@/lib/query/infinite';
import { readList } from '@/utils/apiEnvelope';
import {
  isPickerLoadFailed,
  isPickerLoading,
  isPickerLoadingUntilFresh,
  TRADE_PICKER_QUERY_OPTIONS,
} from '../_lib/picker';

type PickerPage<T> = PageInfo & { items: T[] };

/**
 * One paged trade picker list ("Show more"), shared by every picker (new trade and counter
 * offer, both sides): one `useInfiniteQuery`, rows de-duplicated across pages, the picker
 * freshness rules (`TRADE_PICKER_QUERY_OPTIONS`) and the loading rule (`isPickerLoading`; with
 * `untilFresh`, the counter-offer rule `isPickerLoadingUntilFresh`).
 *
 * The server filters (`tradeOnly`, `tradeEligible`), so every page is full and
 * `meta.totalPages` counts only eligible rows. A refetch (open, screen focus, app foreground,
 * listing invalidation) reloads every page already loaded, so the list never shrinks back to
 * page 1 under the user's picks. The page number is the page param, not part of the key.
 *
 * `fetchPage` returns the raw axios response of one page (`{ data, meta }` body).
 */
export function usePagedPicker<T extends { id: string }>({
  queryKey,
  fetchPage,
  enabled,
  untilFresh = false,
}: {
  queryKey: QueryKey;
  fetchPage: (page: number) => Promise<{ data?: unknown }>;
  enabled: boolean;
  /** Loading until this open's own fetch settles, even over a cached non-empty list. */
  untilFresh?: boolean;
}) {
  const query = useInfiniteQuery({
    queryKey,
    initialPageParam: 1,
    queryFn: async ({ pageParam }): Promise<PickerPage<T>> => {
      const page = pageParam as number;
      const response = await fetchPage(page);
      return { items: readList<T>(response), ...readPageInfo(response.data, page) };
    },
    getNextPageParam: nextPageFromInfo,
    enabled,
    ...TRADE_PICKER_QUERY_OPTIONS,
  });

  // A refetch of several pages can shift a row across a page boundary: first occurrence wins.
  const rows = useMemo(
    () => flattenPagesUnique(query.data?.pages, (p) => p.items, (r) => r.id),
    [query.data],
  );
  const { fetchNextPage } = query;
  const loadMore = useCallback(() => {
    void fetchNextPage();
  }, [fetchNextPage]);

  return {
    rows,
    /** Loading wins over the empty state until this screen's own fetch settles. */
    isLoading: untilFresh
      ? isPickerLoadingUntilFresh(query)
      : isPickerLoading({
          isLoading: query.isLoading,
          isFetching: query.isFetching,
          isFetchedAfterMount: query.isFetchedAfterMount,
          data: rows,
        }),
    /** A fetch of this mount (this open) succeeded: the rows are not only an older open's cache. */
    fetchedThisOpen: query.isFetchedAfterMount && query.isSuccess,
    /** The first load failed and nothing is loaded (not a failed refetch or "Show more"). */
    loadFailed: isPickerLoadFailed(query),
    hasMore: !!query.hasNextPage,
    isLoadingMore: query.isFetchingNextPage,
    loadMore,
    refetch: query.refetch,
  };
}
