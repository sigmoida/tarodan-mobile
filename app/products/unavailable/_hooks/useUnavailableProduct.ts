import { useQuery } from '@tanstack/react-query';
import { productsApi } from '@/lib/api';
import { qk } from '@/lib/query';
import { useSimilarProducts } from '@/hooks/useSimilarProducts';
import type { ProductCardProduct } from '@/components/product';

export interface UnavailableProduct extends ProductCardProduct {
  quantity?: number | null;
  category?: { id: string; name: string; slug: string } | null;
}

/** Satışta olmayan ürün: ürünün kendisi (başlık/kategori/tekrar stokta mı) + benzer ürünler. */
export function useUnavailableProduct(id: string) {
  const productQuery = useQuery({
    queryKey: qk.products.unavailable(id),
    queryFn: async () => {
      try {
        const res = await productsApi.getOne(id);
        return ((res.data as any)?.data ?? res.data) as UnavailableProduct | null;
      } catch {
        return null;
      }
    },
    enabled: !!id,
  });
  const similarQuery = useSimilarProducts(id, !!id, 12);

  const product = productQuery.data ?? null;
  return {
    product,
    similar: similarQuery.data ?? [],
    loading: productQuery.isLoading || similarQuery.isLoading,
    isBackInStock: !!product && product.status === 'active' && (product.quantity ?? 0) > 0,
  };
}
