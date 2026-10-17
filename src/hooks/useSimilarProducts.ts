import { useQuery } from '@tanstack/react-query';
import { productsApi } from '@/lib/api';
import { qk } from '@/lib/query';
import type { ProductCardProduct } from '@/components/product';

/** "Benzer Ürünler" (web `ProductRelated`): `GET /products/:id/similar`. Hata/boş → bölüm çizilmez. */
export function useSimilarProducts(productId: string, enabled: boolean, limit = 8) {
  return useQuery<ProductCardProduct[]>({
    queryKey: qk.products.similar(productId, limit),
    enabled: enabled && !!productId,
    queryFn: async () => {
      try {
        const response = await productsApi.getSimilar(productId, limit);
        const body = response.data as any;
        const list = body?.data ?? body?.products ?? body ?? [];
        return Array.isArray(list) ? list : [];
      } catch {
        return [];
      }
    },
  });
}
