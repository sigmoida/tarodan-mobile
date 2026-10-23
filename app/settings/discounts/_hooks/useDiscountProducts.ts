import { useQuery } from '@tanstack/react-query';
import { productsApi } from '@/lib/api';
import { qk } from '@/lib/query';
import type { MyProduct } from '../_lib/types';

/**
 * The seller's active listings for the product picker (at most 100). A failed load surfaces as
 * `isError` (the picker shows a retry), not as an empty list that reads "no active products".
 */
export function useDiscountProducts(enabled: boolean) {
  const query = useQuery({
    queryKey: qk.membership.discountProducts,
    queryFn: async () => {
      const response = await productsApi.getMyListings({ limit: 100, status: 'active' });
      const data = response.data as MyProduct[] | { data?: MyProduct[]; items?: MyProduct[] } | undefined;
      const items = Array.isArray(data) ? data : (data?.data ?? data?.items);
      return Array.isArray(items) ? items : [];
    },
    enabled,
  });
  return {
    products: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
