import { useQuery } from '@tanstack/react-query';
import { productsApi } from '@/lib/api';
import { qk } from '@/lib/query';
import type { MyProduct } from '../_lib/types';

/** Ürün seçici için satıcının aktif ilanları (en çok 100). */
export function useDiscountProducts(enabled: boolean) {
  const query = useQuery({
    queryKey: qk.membership.discountProducts,
    queryFn: async () => {
      try {
        const response = await productsApi.getMyListings({ limit: 100, status: 'active' });
        const data: any = response.data;
        const items: MyProduct[] = data?.data ?? data?.items ?? data ?? [];
        return Array.isArray(items) ? items : [];
      } catch {
        return [];
      }
    },
    enabled,
  });
  return { products: query.data ?? [], isLoading: query.isLoading, refetch: query.refetch };
}
