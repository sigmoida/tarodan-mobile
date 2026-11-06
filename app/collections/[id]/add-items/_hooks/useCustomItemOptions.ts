import { useQuery } from '@tanstack/react-query';
import { carModelsApi, productsApi } from '@/lib/api';
import { unwrapList } from '@/lib/api/unwrap';
import { qk } from '@/lib/query';

/** Catalog options change rarely (same freshness as the listing form). */
const CATALOG_STALE_MS = 10 * 60 * 1000;

interface Named {
  id: string;
  name: string;
  slug: string;
}

const NONE: never[] = [];

/**
 * Brand / model / scale / manufacturer / material options of the custom-item form (web
 * `useCollectionFilters` + `useCarModels`).
 *
 * Options come from the catalog only. An empty facet is a fact about the catalog and the form shows
 * it ("no options defined"); nothing is substituted, so nobody can pick a material the catalog does
 * not define. The filters share the listing form's cache entry (`qk.products.filterOptions('')`).
 * Models load for the chosen brand's slug only.
 */
export function useCustomItemOptions(brandName: string | undefined) {
  const filters = useQuery({
    queryKey: qk.products.filterOptions(''),
    queryFn: async () => (await productsApi.getFilters()).data,
    staleTime: CATALOG_STALE_MS,
  });

  const data = filters.data;
  const brands = data?.brands ?? NONE;
  const brandSlug = brandName ? brands.find((b) => b.name === brandName)?.slug : undefined;

  const models = useQuery({
    queryKey: qk.catalog.carModels({ brand: brandSlug }),
    queryFn: async () => unwrapList<Named>((await carModelsApi.findByBrand(brandSlug!)).data),
    staleTime: CATALOG_STALE_MS,
    enabled: !!brandSlug,
  });

  return {
    brands,
    scales: data?.scales ?? NONE,
    manufacturers: data?.manufacturers ?? NONE,
    materials: data?.materials ?? NONE,
    models: models.data ?? NONE,
    modelsLoading: !!brandSlug && models.isLoading,
    /** Filters failed to load: the selects are empty, show the inline error with a retry. */
    filtersFailed: filters.isError,
    retryFilters: () => void filters.refetch(),
    modelsFailed: models.isError,
    retryModels: () => void models.refetch(),
  };
}
