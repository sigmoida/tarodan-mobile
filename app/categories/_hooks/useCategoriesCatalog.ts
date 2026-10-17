import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { categoriesApi, manufacturersApi } from '@/lib/api';
import { unwrapList } from '@/lib/api/unwrap';
import { qk } from '@/lib/query';
import { useProductFilterOptions } from '@/hooks/useProductFilterOptions';
import { useRefresh } from '@/hooks/useRefresh';
import { selectWithListings } from '@/utils/catalogListings';
import type { CategoryGroupKey, CategoryNode, GroupStatus, ManufacturerNode } from '../_lib/groups';

const STALE_MS = 10 * 60 * 1000;

/** Boş liste için SABİT referans: yükleme sırasında her render'da yeni `[]` türeyip memo'ları bozmasın. */
const NO_CATEGORIES: CategoryNode[] = [];
const NO_MANUFACTURERS: ManufacturerNode[] = [];
const NO_SCALES: string[] = [];

type DynamicKey = Exclude<CategoryGroupKey, 'explore'>;

/** Eldeki veri varsa `ready`; yoksa yükleniyor / hata / (veri yok ama hazır). */
function statusOf(hasData: boolean, isLoading: boolean, isError: boolean): GroupStatus {
  if (hasData) return 'ready';
  if (isLoading) return 'loading';
  return isError ? 'error' : 'ready';
}

/**
 * Kategoriler ekranının veri kaynakları (web `useNavCatalog` ile aynı üç kaynak): kategori ağacı
 * (`GET /categories`; `useProductFilterOptions` ile AYNI `qk.catalog.categories` anahtarı → tek istek),
 * üreticiler (`GET /manufacturers`; Üreticiler ekranı/ana sayfa şeridiyle aynı anahtar) ve ölçekler
 * (`/products/filters`). Her kaynağın durumu AYRI (`status`) ve AYRI tekrar denenir (`retry`) — biri
 * düşerse yalnız o grup hata gösterir. `isLoading` yalnız kategori VE üretici ilk kez yüklenirken
 * (ekranda gösterecek hiçbir veri yokken); ölçekler (`/products/filters`) tam ekran iskeleti bekletmez.
 */
export function useCategoriesCatalog() {
  const categoriesQuery = useQuery<CategoryNode[]>({
    queryKey: qk.catalog.categories,
    queryFn: async () => unwrapList<CategoryNode>((await categoriesApi.getAll()).data),
    staleTime: STALE_MS,
  });

  const manufacturersQuery = useQuery<ManufacturerNode[]>({
    queryKey: qk.catalog.manufacturers,
    queryFn: async () => unwrapList<ManufacturerNode>((await manufacturersApi.findAll()).data),
    select: selectWithListings,
    staleTime: STALE_MS,
  });

  const filterOptions = useProductFilterOptions();

  const categories = categoriesQuery.data ?? NO_CATEGORIES;
  const manufacturers = manufacturersQuery.data ?? NO_MANUFACTURERS;
  const scales = filterOptions.scales.length > 0 ? filterOptions.scales : NO_SCALES;

  // `refetch` işlevleri sorgu gözlemcisinden gelir ve render'lar arası sabittir.
  const refetchCategories = categoriesQuery.refetch;
  const refetchManufacturers = manufacturersQuery.refetch;
  const refetchFilters = filterOptions.refetch;

  const retryCategories = useCallback(() => void refetchCategories(), [refetchCategories]);
  const retryManufacturers = useCallback(() => void refetchManufacturers(), [refetchManufacturers]);
  const retryScales = useCallback(() => refetchFilters?.(), [refetchFilters]);
  // Çekip-yenile: gösterge yalnız kullanıcı çektiğinde ve üç kaynak bitene dek döner
  // (eskiden `isRefetching` — arka plan tazelemesinde de dönüyordu).
  const { refreshing, onRefresh: retryAll } = useRefresh(
    refetchCategories,
    refetchManufacturers,
    retryScales,
  );

  const categoriesStatus = statusOf(categories.length > 0, categoriesQuery.isLoading, categoriesQuery.isError);
  const manufacturersStatus = statusOf(
    manufacturers.length > 0,
    manufacturersQuery.isLoading,
    manufacturersQuery.isError,
  );
  const scalesStatus = statusOf(scales.length > 0, filterOptions.isLoading, filterOptions.isError === true);
  const status = useMemo<Record<DynamicKey, GroupStatus>>(
    () => ({ categories: categoriesStatus, manufacturers: manufacturersStatus, scales: scalesStatus }),
    [categoriesStatus, manufacturersStatus, scalesStatus],
  );
  const retry = useMemo<Record<DynamicKey, () => void>>(
    () => ({ categories: retryCategories, manufacturers: retryManufacturers, scales: retryScales }),
    [retryCategories, retryManufacturers, retryScales],
  );

  return {
    categories,
    manufacturers,
    scales,
    status,
    retry,
    retryAll,
    isLoading: categoriesQuery.isLoading && manufacturersQuery.isLoading,
    refreshing,
  };
}
