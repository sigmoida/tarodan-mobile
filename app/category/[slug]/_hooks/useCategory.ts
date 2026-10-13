import { logger, safeError } from '@/services/logger';
import { useState, useCallback } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { productsApi, categoriesApi } from '@/lib/api';
import { buildSortOptions } from '@/utils/productFilters';

/**
 * Category controller — owns the category-detail query, the filtered products
 * query (search + sort + scale), refresh and the sort-menu/label. Lifted
 * verbatim from the monolithic screen (§12).
 */
export function useCategory() {
  const { t } = useTranslation();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('created_desc');
  const [selectedScale, setSelectedScale] = useState('');
  const [sortMenuVisible, setSortMenuVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  // Izgara / liste görünümü (web ProductLayoutSelector) — ortak araç çubuğu anahtarı.
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');

  const { data: category } = useQuery({
    queryKey: ['category', slug],
    queryFn: async () => {
      try {
        const response = await categoriesApi.getBySlug(slug);
        return response.data.category || response.data;
      } catch (error) {
        logger.debug('Category fetch error', { err: safeError(error) });
        return null;
      }
    },
    enabled: !!slug,
  });

  const { data: products, isLoading, refetch } = useQuery({
    queryKey: ['category-products', category?.id, searchQuery, sortBy, selectedScale],
    queryFn: async () => {
      try {
        const params: any = { categoryId: category?.id, limit: 50 };
        // Web gibi: 'Önerilen' sunucunun varsayılanı — sortBy gönderilmez.
        if (sortBy !== 'relevance') params.sortBy = sortBy;
        if (searchQuery) params.search = searchQuery;
        if (selectedScale) params.scale = selectedScale;

        const response = await productsApi.getAll(params);
        return response.data.data || response.data.products || [];
      } catch (error) {
        logger.debug('Products fetch error', { err: safeError(error) });
        return [];
      }
    },
    enabled: !!category?.id,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const getSortLabel = () =>
    buildSortOptions(t).find((o) => o.value === sortBy)?.label || t('common.sort');

  return {
    category,
    products,
    isLoading,
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
