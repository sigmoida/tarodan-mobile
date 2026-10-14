import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { productsApi } from '@/lib/api';
import { qk } from '@/lib/query';
import { useProductFilterOptions } from '@/hooks/useProductFilterOptions';
import {
  EMPTY_FILTERS,
  buildSortOptions,
  buildListParams,
  clearProductFilters,
  countActiveFilters,
  extractListings,
  extractMeta,
  flattenUniqueListings,
  type ProductFilters,
} from '@/utils/productFilters';
import { buildActiveChips } from '@/utils/activeFilterChips';

const PAGE_SIZE = 24;
/** Üst arama kutusu yazmayı bırakınca `filters.search`'e yazılır (arama ekranıyla aynı süre). */
const SEARCH_DEBOUNCE_MS = 400;

/**
 * Listings controller — owns the filters + search state, the manufacturer-slug
 * resolution, the bounded infinite query, derived listings/total/active chips,
 * and the modal visibility flags. Lifted verbatim from the monolithic screen (§12).
 */
export function useListings() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{
    brand?: string;
    scale?: string;
    categoryId?: string;
    category?: string;
    manufacturer?: string;
    search?: string;
    discountOnly?: string;
    tradeOnly?: string;
    sortBy?: string;
  }>();

  const [filters, setFilters] = useState<ProductFilters>(() => ({
    ...EMPTY_FILTERS,
    search: params.search || '',
    brand: params.brand || '',
    scale: params.scale || '',
    categoryId: params.categoryId || '',
    category: params.category || '',
    manufacturer: params.manufacturer || '',
    // Ana sayfa "Tümünü gör" bağlantıları (web: /listings?discountOnly=true, ?sortBy=view_count_desc).
    discountOnly: params.discountOnly === 'true',
    tradeOnly: params.tradeOnly === 'true',
    sortBy: params.sortBy || EMPTY_FILTERS.sortBy,
  }));

  // Arama metninin TEK kaynağı `filters.search`. Üst kutu yalnız yazım taslağını tutar:
  // debounce/Enter ile `filters.search`'e işlenir, filtre sayfası veya çip `filters.search`'i
  // değiştirirse taslak ona eşitlenir.
  const [searchQuery, setSearchQuery] = useState(filters.search);
  useEffect(() => {
    // Debounce kırpılmış metni işler; kutudaki sondaki boşluğu silmemek için yalnız
    // içerik gerçekten farklıysa (filtre sayfası/çip) eşitle.
    setSearchQuery((prev) => (prev.trim() === filters.search ? prev : filters.search));
  }, [filters.search]);
  useEffect(() => {
    const q = searchQuery.trim();
    const id = setTimeout(
      () => setFilters((prev) => (prev.search.trim() === q ? prev : { ...prev, search: q })),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(id);
  }, [searchQuery]);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [sortMenuVisible, setSortMenuVisible] = useState(false);
  // Izgara / liste görünümü (web ProductLayoutSelector).
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');

  // Seçili üreticinin slug'ını çöz ki üreticiye-özel filtreler (HW vb.) yüklensin.
  const baseOptions = useProductFilterOptions();
  const manufacturerSlug = useMemo(() => {
    const list = baseOptions.manufacturers;
    if (filters.manufacturerId) return list.find((m) => m.id === filters.manufacturerId)?.slug;
    if (filters.manufacturer)
      return list.find((m) => m.name.toLowerCase() === filters.manufacturer.toLowerCase())?.slug;
    return undefined;
  }, [filters.manufacturerId, filters.manufacturer, baseOptions.manufacturers]);
  const options = useProductFilterOptions(manufacturerSlug);

  const applySearch = () =>
    setFilters((prev) => {
      const q = searchQuery.trim();
      return prev.search.trim() === q ? prev : { ...prev, search: q };
    });
  // Sıralama değişimi mevcut filtreleri OLDUĞU GİBİ korur (bayat `filters` kapanımı yok).
  const setSortBy = useCallback(
    (sortBy: string) => setFilters((prev) => (prev.sortBy === sortBy ? prev : { ...prev, sortBy })),
    [],
  );

  const {
    data,
    isLoading,
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: qk.products.listings(filters),
    placeholderData: keepPreviousData,
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const listParams = buildListParams(filters, pageParam as number, PAGE_SIZE);
      const res = await productsApi.getAll(listParams);
      return {
        items: extractListings(res.data),
        meta: extractMeta(res.data, pageParam as number, PAGE_SIZE),
      };
    },
    getNextPageParam: (last) =>
      last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined,
    // Bound resident pages (#76) — image-heavy list, trim trailing pages.
    maxPages: 5,
    getPreviousPageParam: (first) => (first.meta.page > 1 ? first.meta.page - 1 : undefined),
  });

  const listings: any[] = useMemo(() => flattenUniqueListings(data?.pages), [data]);
  const total = data?.pages[0]?.meta.total ?? 0;
  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters]);

  // "Temizle" filtreleri sıfırlar; sıralama ve üst arama metni kalır.
  const clearFilters = useCallback(() => setFilters(clearProductFilters), []);

  const sortOptions = useMemo(() => buildSortOptions(t), [t]);
  const getSortLabel = () =>
    sortOptions.find((o) => o.value === filters.sortBy)?.label || t('product.sortBy');

  const activeChips = buildActiveChips(filters, setFilters, t, options.customAttributes);

  return {
    filters,
    setFilters,
    setSortBy,
    searchQuery,
    setSearchQuery,
    applySearch,
    filterModalVisible,
    setFilterModalVisible,
    sortMenuVisible,
    setSortMenuVisible,
    layout,
    setLayout,
    options,
    listings,
    total,
    activeFilterCount,
    activeChips,
    clearFilters,
    getSortLabel,
    isLoading,
    isFetching,
    isFetchingNextPage,
    isRefetching,
    hasNextPage,
    fetchNextPage,
    refetch,
  };
}

export type ListingsController = ReturnType<typeof useListings>;
