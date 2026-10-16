import { useCallback, useEffect, useMemo, useState } from 'react';
import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { categoriesApi, collectionsApi } from '@/lib/api';
import { qk } from '@/lib/query';
import { useAuthStore } from '@/stores/authStore';
import { useRefresh } from '@/hooks/useRefresh';
import type { ActiveFilterChip } from '@/components/product';
import {
  DEFAULT_SORT,
  PUBLIC_PAGE_SIZE,
  SEARCH_DEBOUNCE_MS,
  SORT_OPTIONS,
  buildBrowseParams,
  filterAndSortMine,
  flattenCategories,
  flattenPages,
  getNextBrowsePage,
  unwrapCategories,
  unwrapCollectionsPage,
  type BrowseTab,
  type SortOption,
} from '../_lib/browse';

/**
 * Koleksiyon tarama controller'ı (web `CollectionsContext`):
 * - "Herkese açık" sekmesi: `/collections/browse` sonsuz liste — `sortBy` + sunucu araması
 *   (`search`, debounce) + `categoryId`.
 * - "Benim" sekmesi (yalnız girişli): `/collections/me`, arama/sıralama istemcide (web gibi).
 * - Kategori ağacı, sıralama/kategori sheet'lerinin açık durumu ve aktif filtre çipi.
 */
export function useCollectionsBrowse() {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  // Premium/business üyeler zaten koleksiyon oluşturabildiği için upsell'i gizle.
  const isPremiumMember = user?.membershipTier === 'premium' || user?.membershipTier === 'business';

  const [tab, setTab] = useState<BrowseTab>('public');
  // Oturum kapanırsa "Benim" sekmesi kendiliğinden düşer.
  const activeTab: BrowseTab = isAuthenticated ? tab : 'public';
  const [searchQuery, setSearchQuery] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>(DEFAULT_SORT);
  const [categoryId, setCategoryId] = useState('');
  const [sheet, setSheet] = useState<'sort' | 'category' | null>(null);

  useEffect(() => {
    const q = searchQuery.trim();
    const id = setTimeout(() => setSearch(q), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [searchQuery]);

  // Web: sekme değişince arama sıfırlanır.
  const setActiveTab = useCallback((next: BrowseTab) => {
    setTab(next);
    setSearchQuery('');
    setSearch('');
  }, []);

  const categoriesQuery = useQuery({
    queryKey: qk.catalog.collectionCategories,
    queryFn: async () => unwrapCategories((await categoriesApi.getAll({ refresh: '1' })).data),
    staleTime: 10 * 60 * 1000,
  });
  const categories = useMemo(() => flattenCategories(categoriesQuery.data ?? []), [categoriesQuery.data]);

  const publicQuery = useInfiniteQuery({
    queryKey: qk.collections.list({ sortBy, search, categoryId }),
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const res = await collectionsApi.browse({
        ...buildBrowseParams(sortBy, search, categoryId),
        page: pageParam,
        pageSize: PUBLIC_PAGE_SIZE,
      });
      return unwrapCollectionsPage(res.data, pageParam);
    },
    getNextPageParam: getNextBrowsePage,
    placeholderData: keepPreviousData,
    enabled: activeTab === 'public',
  });

  // Ayarlar > Koleksiyonlarım ile aynı anahtar ve şekil (dizi) — önbellek paylaşılır.
  const myQuery = useQuery({
    queryKey: qk.collections.mine,
    queryFn: async () => unwrapCollectionsPage((await collectionsApi.getMyCollections()).data).collections,
    enabled: isAuthenticated && activeTab === 'mine',
  });

  const publicCollections = useMemo(() => flattenPages(publicQuery.data?.pages), [publicQuery.data]);
  const myCollections = useMemo(
    () => filterAndSortMine(Array.isArray(myQuery.data) ? myQuery.data : [], searchQuery, sortBy),
    [myQuery.data, searchQuery, sortBy],
  );

  const isPublic = activeTab === 'public';
  const active = isPublic ? publicQuery : myQuery;
  const collections = isPublic ? publicCollections : myCollections;

  const { hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage } = publicQuery;
  // Yalnız kullanıcının çektiği yenileme döner: keepPreviousData ile arama/sıralama/kategori
  // değişimi de `isRefetching` sayılıyor, RefreshControl dönüp iOS listesi zıplıyordu.
  const { refreshing, onRefresh } = useRefresh(active.refetch);
  const loadMore = useCallback(() => {
    // Sayfa hatasında kaydırdıkça otomatik yeniden denemez; kullanıcı "Tekrar dene" satırına basar.
    if (isPublic && hasNextPage && !isFetchingNextPage && !isFetchNextPageError) void fetchNextPage();
  }, [isPublic, hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage]);
  const retryLoadMore = useCallback(() => void fetchNextPage(), [fetchNextPage]);

  const sortOptions = useMemo(
    () => SORT_OPTIONS.map((o) => ({ value: o.value, label: o.labelKey ? t(o.labelKey) : (o.label ?? o.value) })),
    [t],
  );
  const sortLabel = sortOptions.find((o) => o.value === sortBy)?.label ?? t('common.sort');
  const categoryOptions = useMemo(
    () => [{ value: '', label: t('product.allCategories') }, ...categories.map((c) => ({ value: c.id, label: c.name }))],
    [categories, t],
  );
  const selectedCategory = categories.find((c) => c.id === categoryId);
  const clearCategory = useCallback(() => setCategoryId(''), []);
  const activeChips: ActiveFilterChip[] =
    isPublic && categoryId
      ? [{ key: 'category', label: selectedCategory?.name ?? t('common.category'), onRemove: clearCategory }]
      : [];

  return {
    isAuthenticated,
    isPremiumMember,
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    sortOptions,
    sortLabel,
    categoryId,
    setCategoryId,
    categoryOptions,
    categoriesLoading: categoriesQuery.isLoading,
    activeChips,
    clearCategory,
    sheet,
    openSortSheet: () => setSheet('sort'),
    openCategorySheet: () => setSheet('category'),
    closeSheet: () => setSheet(null),
    collections,
    isLoading: active.isLoading,
    isError: active.isError && collections.length === 0,
    refreshing,
    onRefresh,
    refetch: active.refetch,
    loadMore,
    isFetchingNextPage: isPublic && isFetchingNextPage,
    /** Sonraki sayfa yüklenemedi → liste altında "Tekrar dene" satırı. */
    loadMoreFailed: isPublic && isFetchNextPageError,
    retryLoadMore,
    hasSearch: searchQuery.trim().length > 0,
  };
}

export type CollectionsBrowseController = ReturnType<typeof useCollectionsBrowse>;
