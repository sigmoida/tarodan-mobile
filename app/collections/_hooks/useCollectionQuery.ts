import { useQuery } from '@tanstack/react-query';
import { collectionsApi } from '@/lib/api';
import { qk } from '@/lib/query';
import type { CollectionDetail } from '../_lib/types';

/**
 * The collection behind the detail and edit screens: ONE query (`qk.collections.detail`) and one body
 * shape, so the two screens never write different data under the same key.
 *
 * A 404 is the one answer that means "not found" (`null`: the screens show their not-found state).
 * Any other failure throws, so the screen shows an error with a retry instead of a false "not found".
 */
export function useCollectionQuery(id: string | undefined) {
  return useQuery<CollectionDetail | null>({
    queryKey: qk.collections.detail(String(id)),
    enabled: !!id,
    queryFn: async () => {
      try {
        const response = await collectionsApi.getOne(String(id));
        return (response.data?.data ?? response.data ?? null) as CollectionDetail | null;
      } catch (error) {
        if ((error as { response?: { status?: number } })?.response?.status === 404) return null;
        throw error;
      }
    },
  });
}
