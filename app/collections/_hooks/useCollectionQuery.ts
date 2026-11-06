import { useQuery } from '@tanstack/react-query';
import { collectionsApi } from '@/lib/api';
import { qk } from '@/lib/query';
import type { CollectionDetail } from '../_lib/types';

/** What the screen says when the API refuses the read, the same texts as web `CollectionDetailContext`. */
const REFUSAL_TITLE: Record<number, 'collection.invalidLink' | 'collection.privateCollection' | 'collection.collectionNotFound'> = {
  400: 'collection.invalidLink',
  403: 'collection.privateCollection',
  404: 'collection.collectionNotFound',
};

/**
 * The collection behind the detail and edit screens: ONE query (`qk.collections.detail`), one body
 * shape and one reading of its failures, so the two screens never disagree.
 *
 * - `refusal`: the API answered 400, 403 (another user's private collection) or 404. Trying again
 *   cannot help (4xx is not retried), so the screen says why, without a retry. It wins over a cached
 *   body: a collection that has just turned private is not shown from the cache.
 * - `loadFailed`: the first read failed for any other reason (offline, 5xx); the screen offers a retry.
 *   A failed refresh of a collection already on screen keeps it there.
 */
export function useCollectionQuery(id: string | undefined) {
  const query = useQuery<CollectionDetail | null>({
    queryKey: qk.collections.detail(String(id)),
    enabled: !!id,
    queryFn: async () => {
      const response = await collectionsApi.getOne(String(id));
      return (response.data?.data ?? response.data ?? null) as CollectionDetail | null;
    },
  });

  const status = (query.error as { response?: { status?: number } } | null)?.response?.status;
  const refusal = status === undefined ? undefined : REFUSAL_TITLE[status];

  return {
    collection: refusal ? null : query.data,
    isLoading: query.isLoading,
    refusal,
    loadFailed: query.isLoadingError && !refusal,
    refetch: query.refetch,
  };
}
