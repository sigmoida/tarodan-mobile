import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { carModelsApi, productsApi } from '@/lib/api';
import { qk } from '@/lib/query';
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
    queryFn: async () => {
      try {
        const response = await productsApi.getAll({ carModel: slugStr, limit: 50 });
        const data: any = response.data;
        const items: ProductCardProduct[] = data?.items ?? data?.data ?? data ?? [];
        return Array.isArray(items) ? items : [];
      } catch {
        return [];
      }
    },
    enabled: !!slugStr,
  });

  const { refreshing, onRefresh } = useRefresh(modelQuery.refetch, productsQuery.refetch);

  const model = modelQuery.data;
  const products = productsQuery.data ?? [];

  return {
    modelQuery,
    productsQuery,
    model,
    products,
    refreshing,
    onRefresh,
  };
}

export type ModelDetailController = ReturnType<typeof useModelDetail>;
