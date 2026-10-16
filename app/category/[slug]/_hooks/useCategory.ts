import { logger, safeError } from '@/services/logger';
import { useState, useCallback } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { productsApi, categoriesApi } from '@/lib/api';
import { isNotFoundError, qk } from '@/lib/query';
import { EMPTY_FILTERS, buildSortOptions } from '@/utils/productFilters';

/**
 * Category controller — owns the category-detail query, the filtered products
 * query (search + sort + scale), refresh and the sort-menu/label. Lifted
 * verbatim from the monolithic screen (§12).
 */
export function useCategory() {
  const { t } = useTranslation();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState(EMPTY_FILTERS.sortBy);
  const [selectedScale, setSelectedScale] = useState('');
  const [sortMenuVisible, setSortMenuVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  // Izgara / liste görünümü (web ProductLayoutSelector) — ortak araç çubuğu anahtarı.
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');

  const categoryQuery = useQuery({
    queryKey: qk.catalog.category(slug ?? ''),
    queryFn: async () => {
      try {
        const response = await categoriesApi.getBySlug(slug);
        return response.data.category || response.data;
      } catch (error) {
        // Yalnız 404 "kategori yok" (null); ağ/5xx FIRLATILIR → ErrorState + yeniden dene.
        if (isNotFoundError(error)) return null;
        logger.debug('Category fetch error', { err: safeError(error) });
        throw error;
      }
    },
    enabled: !!slug,
  });
  const category = categoryQuery.data;

  // Hata yutulmaz: önbelleğe `[]` yazmak hatayı "bu kategoride ürün yok" gibi gösteriyordu.
  const productsQuery = useQuery({
    queryKey: qk.products.categoryProducts(category?.id, searchQuery, sortBy, selectedScale),
    queryFn: async () => {
      const params: any = { categoryId: category?.id, limit: 50 };
      // Web gibi: 'Önerilen' sunucunun varsayılanı — sortBy gönderilmez.
      if (sortBy !== 'relevance') params.sortBy = sortBy;
      if (searchQuery) params.search = searchQuery;
      if (selectedScale) params.scale = selectedScale;

      const response = await productsApi.getAll(params);
      return response.data.data || response.data.products || [];
    },
    enabled: !!category?.id,
  });
  const products = productsQuery.data;
  const { refetch } = productsQuery;

  // Ürün sorgusu kategori gelene dek `enabled: false` (isLoading=false) — kategori yüklenirken
  // de iskelet gösterilir, aksi halde bir an "ürün yok" çakıyordu.
  const isLoading = categoryQuery.isLoading || productsQuery.isLoading;
  const loadFailed =
    (categoryQuery.isError && !category) || (productsQuery.isError && !products);
  const retry = useCallback(() => {
    if (categoryQuery.isError) void categoryQuery.refetch();
    else void refetch();
  }, [categoryQuery, refetch]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([categoryQuery.refetch(), category?.id ? refetch() : null]);
    setRefreshing(false);
  }, [categoryQuery, category?.id, refetch]);

  const getSortLabel = () =>
    buildSortOptions(t).find((o) => o.value === sortBy)?.label || t('common.sort');

  return {
    category,
    products,
    isLoading,
    loadFailed,
    retry,
    refreshing,
    onRefresh,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    selectedScale,
    setSelectedScale,
    sortMenuVisible,
    setSortMenuVisible,
    layout,
    setLayout,
    getSortLabel,
  };
}

export type CategoryController = ReturnType<typeof useCategory>;
