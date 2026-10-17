import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { confirm } from '@/ui';
import { qk, useAppMutation } from '@/lib/query';
import { useAuthStore } from '@/stores/authStore';
import { useRefetchStaleOnFocus } from '@/hooks/useRefetchStaleOnFocus';
import { STORAGE_KEY, type SavedSearch } from '../_lib/types';
import { buildSearchParams } from '../_lib/helpers';

/**
 * Saved-searches controller — owns the AsyncStorage-backed list query, the
 * delete + notify-toggle mutations, run-search navigation and delete confirm.
 * Lifted verbatim from the monolithic screen (app/CLAUDE.md › Worked examples).
 */
export function useSavedSearches() {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const limits = useAuthStore((s) => s.limits);
  const queryClient = useQueryClient();

  const maxSavedSearches = limits?.maxSavedSearches || 5;

  const { data: searchesData, isLoading, isError, refetch } = useQuery({
    queryKey: qk.user.savedSearches,
    queryFn: async (): Promise<SavedSearch[]> => {
      // Depolama okuma hatası FIRLATILIR (isError → ErrorState); yalnız bozuk JSON boş liste sayılır.
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      try {
        const parsed = stored ? JSON.parse(stored) : [];
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        console.log('Failed to parse saved searches');
        return [];
      }
    },
    enabled: isAuthenticated,
  });

  const searches: SavedSearch[] = searchesData || [];

  // Ekrana dönüşte yalnız bayatsa tazele (silme/bildirim yazımları zaten invalidate ediyor).
  useRefetchStaleOnFocus([qk.user.savedSearches], isAuthenticated);

  const deleteMutation = useAppMutation(
    async (searchId: string) => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const list: SavedSearch[] = stored ? JSON.parse(stored) : [];
      const next = list.filter((s) => s.id !== searchId);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    },
    {
      invalidates: [qk.user.savedSearches],
      success: t('savedSearch.deletedMsg'),
      error: t('savedSearch.deleteFailedMsg'),
    },
  );

  const toggleNotificationMutation = useMutation({
    mutationFn: async ({ searchId, notifyEnabled }: { searchId: string; notifyEnabled: boolean }) => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const list: SavedSearch[] = stored ? JSON.parse(stored) : [];
      const next = list.map((s) => (s.id === searchId ? { ...s, notifyEnabled } : s));
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.user.savedSearches });
    },
  });

  const runSearch = (search: SavedSearch) => {
    router.push(`/search?${buildSearchParams(search)}`);
  };

  const handleDelete = async (search: SavedSearch) => {
    const ok = await confirm({
      title: t('savedSearch.deleteTitle'),
      message: t('savedSearch.deleteConfirm', { name: search.name }),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (ok) deleteMutation.mutate(search.id);
  };

  return {
    isAuthenticated,
    maxSavedSearches,
    searches,
    isLoading,
    /** Liste okunamadı (önbellekte de yok) — "kayıtlı arama yok" değil, ErrorState. */
    loadFailed: isError && !searchesData,
    retry: () => {
      void refetch();
    },
    toggleNotificationMutation,
    runSearch,
    handleDelete,
  };
}

export type SavedSearchesController = ReturnType<typeof useSavedSearches>;
