import { useQuery } from '@tanstack/react-query';
import { brandsApi, manufacturersApi, productsApi } from '@/lib/api';
import { qk } from '@/lib/query';
import type { ProductCardProduct } from '@/components/product';

export type CatalogEntityKind = 'brand' | 'manufacturer';

export interface CatalogEntity {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  description?: string;
  productCount?: number;
}

/**
 * Marka / üretici detayı: varlığı slug ile çözer, sonra ürünlerini `productsApi.getAll`
 * (`brandId` | `manufacturerId`) ile getirir. İki ekran (marka, üretici) tek kontrolcüyü paylaşır.
 */
export function useEntityProducts(kind: CatalogEntityKind, slug: string | undefined) {
  const isBrand = kind === 'brand';

  const entityQuery = useQuery<CatalogEntity | null>({
    queryKey: isBrand ? qk.catalog.brand(slug ?? '') : qk.catalog.manufacturer(slug ?? ''),
    queryFn: async () => {
      if (!slug) return null;
      const response = isBrand
        ? await brandsApi.findBySlug(slug)
        : await manufacturersApi.findBySlug(slug);
      return response.data?.data ?? response.data ?? null;
    },
    enabled: !!slug,
  });
  const entity = entityQuery.data ?? null;

  const productsQuery = useQuery<ProductCardProduct[]>({
    queryKey: isBrand
      ? qk.catalog.brandProducts(entity?.id)
      : qk.catalog.manufacturerProducts(entity?.id),
    queryFn: async () => {
      if (!entity?.id) return [];
      const response = await productsApi.getAll({
        ...(isBrand ? { brandId: entity.id } : { manufacturerId: entity.id }),
        status: 'active',
      });
      const payload = response.data?.data ?? response.data ?? [];
      return Array.isArray(payload) ? payload : (payload?.products ?? []);
    },
    enabled: !!entity?.id,
  });

  return {
    entity,
    products: productsQuery.data ?? [],
    // Varlık çözülmeden ürün sorgusu devre dışıdır (isLoading=false): boş durum erken çakmasın.
    loading: entityQuery.isLoading || (!!entity?.id && productsQuery.isPending),
    error: productsQuery.error,
    refetch: productsQuery.refetch,
    isRefetching: productsQuery.isRefetching,
  };
}
