import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { carModelsApi, productsApi } from '@/lib/api';
import { isNotFoundError, qk } from '@/lib/query';
import { useRefresh } from '@/hooks/useRefresh';
import type { ProductCardProduct } from '@/components/product';
import type { CarModelDetail } from '../_lib/types';

/**
 * Model-detail controller — owns the car-model query + its products query,
 * and pull-to-refresh. Lifted verbatim from the
 * monolithic screen (§12).
 */
export function useModelDetail() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const slugStr = String(slug ?? '');

  const modelQuery = useQuery({
    queryKey: qk.catalog.carModel(slugStr),
    queryFn: async () => {
      const response = await carModelsApi.findBySlug(slugStr);
      return (response.data as any) as CarModelDetail | null;
    },
    enabled: !!slugStr,
  });

  const productsQuery = useQuery({
    queryKey: qk.catalog.modelProducts(slugStr),
    // Hata yutulmaz (önbelleğe `[]` = "ürün yok" yalanı) → kart içi ErrorState + yeniden dene.
    queryFn: async () => {
      const response = await productsApi.getAll({ carModel: slugStr, limit: 50 });
      const data: any = response.data;
      const items: ProductCardProduct[] = data?.items ?? data?.data ?? data ?? [];
      return Array.isArray(items) ? items : [];
    },
    enabled: !!slugStr,
  });

  const { refreshing, onRefresh } = useRefresh(modelQuery.refetch, productsQuery.refetch);

  const model = modelQuery.data;
  const products = productsQuery.data ?? [];
  // Gerçek 404 ya da boş gövde → "bulunamadı"; diğer hatalar (ağ/5xx) → ErrorState + yeniden dene.
  const modelLoadFailed = modelQuery.isError && !model && !isNotFoundError(modelQuery.error);
  const notFound = !modelQuery.isLoading && !model && !modelLoadFailed;

  return {
    modelQuery,
    productsQuery,
    model,
    products,
    modelLoadFailed,
    notFound,
    refreshing,
    onRefresh,
  };
}

export type ModelDetailController = ReturnType<typeof useModelDetail>;
