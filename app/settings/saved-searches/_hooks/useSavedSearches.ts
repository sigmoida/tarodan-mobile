import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { confirm } from '@/ui';
import { savedSearchesApi } from '@/lib/api';
import { qk } from '@/lib/query';
import { savedSearchToRouteParams, type SavedSearch } from '@/types';
import { useAuthStore } from '@/stores/authStore';
import { useRefetchStaleOnFocus } from '@/hooks/useRefetchStaleOnFocus';
import { useRefresh } from '@/hooks/useRefresh';
import { useProductFilterOptions } from '@/hooks/useProductFilterOptions';
import { useDoDeleteSavedSearch } from './useDoDeleteSavedSearch';

export interface SavedSearchList {
  items: SavedSearch[];
  total: number;
}

/**
 * Every page of `GET /saved-searches`. Launch tiers fit in one page of 100, but an admin can set a
 * tier up to 1000 and a search past the first page must still be visible and deletable. The other
 * pages load in parallel; an id that shifts onto two pages (a save elsewhere meanwhile) is kept once.
 */
export async function fetchAllSavedSearches(): Promise<SavedSearchList> {
  const first = (await savedSearchesApi.list(1)).data;
  const totalPages = Number(first?.meta?.totalPages) || 1;
  const rest = await Promise.all(
    Array.from({ length: Math.max(totalPages - 1, 0) }, (_, i) => savedSearchesApi.list(i + 2).then((res) => res.data)),
  );
  const byId = new Map<string, SavedSearch>();
  for (const page of [first, ...rest]) {
    for (const item of page?.data ?? []) if (!byId.has(item.id)) byId.set(item.id, item);
  }
  const items = [...byId.values()];
  const total = Number(first?.meta?.total);
  return { items, total: Number.isFinite(total) ? total : items.length };
}

/**
 * Saved-searches controller: the server list under `qk.user.savedSearches`, the tier limit, delete
 * (with confirm) and run. The limit is the server value of the effective tier (`limits.maxSavedSearches`,
 * filled by `useMembershipLimits` at the app root): `undefined` until it is known, 0 is valid, there
 * is no "unlimited". The old device-local list is discarded at startup (`clearSavedSearches`).
 */
export function useSavedSearches() {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const limit = useAuthStore((s) => s.limits?.maxSavedSearches);

  const query = useQuery({
    queryKey: qk.user.savedSearches,
    queryFn: fetchAllSavedSearches,
    enabled: isAuthenticated,
  });
  // A search saved on web shows after a pull-to-refresh, or when the screen is focused again stale.
  useRefetchStaleOnFocus([qk.user.savedSearches], isAuthenticated);
  const { refreshing, onRefresh } = useRefresh(query.refetch);

  const searches = query.data?.items ?? NO_SEARCHES;
  const total = query.data?.total ?? 0;
  const atLimit = limit !== undefined && total >= limit;

  // One read of the shared filter catalog, only when a saved search filters by colour (names the chip).
  const needsColors = searches.some((search) => !!search.query.color);
  const { colors } = useProductFilterOptions(undefined, { enabled: isAuthenticated && needsColors });

  const deleteMutation = useDoDeleteSavedSearch();

  const handleDelete = async (search: SavedSearch) => {
    const ok = await confirm({
      title: t('savedSearch.deleteTitle'),
      message: t('savedSearch.deleteConfirm', { name: search.name ?? t('savedSearch.untitled') }),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (ok) deleteMutation.mutate(search.id);
  };

  /** `savedSearchToRouteParams` emits the names `/search` reads (`search`, `tradeOnly`, `attr.<group>`, labels). */
  const runSearch = (search: SavedSearch) =>
    router.push({ pathname: '/search', params: savedSearchToRouteParams(search.query, search.labels) });

  return {
    isAuthenticated,
    searches,
    total,
    limit,
    atLimit,
    colors,
    isLoading: query.isLoading,
    /** The list could not be read and nothing is cached: an error state, not "no saved searches". */
    loadFailed: query.isError && !query.data,
    retry: () => {
      void query.refetch();
    },
    refreshing,
    onRefresh,
    pendingId: deleteMutation.isPending ? deleteMutation.variables : undefined,
    handleDelete,
    runSearch,
  };
}

const NO_SEARCHES: SavedSearch[] = [];

export type SavedSearchesController = ReturnType<typeof useSavedSearches>;
