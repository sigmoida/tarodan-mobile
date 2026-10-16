import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { categoriesApi, manufacturersApi } from '@/lib/api';
import { qk } from '@/lib/query';
import { useProductFilterOptions } from '@/hooks/useProductFilterOptions';
import { selectWithListings } from '@/utils/catalogListings';
import type { CategoryNode, ManufacturerNode } from '../_lib/groups';

const STALE_MS = 10 * 60 * 1000;

/** Uç `[...]` ya da `{ data: [...] }` dönebilir (web `useNavCatalog`). */
const toList = <T>(body: unknown): T[] => {
  const raw = (body as { data?: unknown } | null)?.data ?? body ?? [];
  return Array.isArray(raw) ? (raw as T[]) : [];
};

/**
 * Kategoriler ekranının veri kaynakları (web `useNavCatalog` ile aynı üç kaynak): kategori ağacı
 * (`GET /categories`), üreticiler (`GET /manufacturers`; Üreticiler ekranı/ana sayfa şeridiyle
 * aynı sorgu anahtarı) ve ölçekler (`/products/filters`, ilanlar filtresiyle aynı kaynak).
 * `error` yalnız dinamik kaynakların HEPSİ başarısızsa dolar (biri geldiyse o grup gösterilir).
 */
export function useCategoriesCatalog() {
  const categories = useQuery<CategoryNode[]>({
    queryKey: qk.catalog.categories,
    queryFn: async () => toList<CategoryNode>((await categoriesApi.getAll()).data),
    staleTime: STALE_MS,
  });

  const manufacturers = useQuery<ManufacturerNode[]>({
    queryKey: qk.catalog.manufacturers,
    queryFn: async () => toList<ManufacturerNode>((await manufacturersApi.findAll()).data),
    select: selectWithListings,
    staleTime: STALE_MS,
  });

  const filterOptions = useProductFilterOptions();
  const refetchFilters = filterOptions.refetch;

  const refetch = useCallback(() => {
    void categories.refetch();
    void manufacturers.refetch();
    refetchFilters?.();
  }, [categories, manufacturers, refetchFilters]);

  return {
    categories: categories.data ?? [],
    manufacturers: manufacturers.data ?? [],
    scales: filterOptions.scales,
    isLoading: categories.isLoading || manufacturers.isLoading || filterOptions.isLoading,
    isRefetching: categories.isRefetching || manufacturers.isRefetching,
    error: categories.error && manufacturers.error ? categories.error : null,
    refetch,
  };
}
