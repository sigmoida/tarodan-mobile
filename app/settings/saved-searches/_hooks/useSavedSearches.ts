import { useCallback } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { appAlert } from '@/ui';
import { useAuthStore } from '@/stores/authStore';
import { STORAGE_KEY, type SavedSearch } from '../_lib/types';
import { buildSearchParams } from '../_lib/helpers';

/**
 * Saved-searches controller — owns the AsyncStorage-backed list query, the
 * delete + notify-toggle mutations, run-search navigation and delete confirm.
 * Lifted verbatim from the monolithic screen (§12).
 */
export function useSavedSearches() {
  const { t } = useTranslation();
  const { isAuthenticated, limits } = useAuthStore();
  const queryClient = useQueryClient();

  const maxSavedSearches = limits?.maxSavedSearches || 5;

  const { data: searchesData, isLoading, refetch } = useQuery({
    queryKey: ['saved-searches'],
    queryFn: async (): Promise<SavedSearch[]> => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        const parsed = stored ? JSON.parse(stored) : [];
        return Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        console.log('Failed to fetch saved searches');
        return [];
      }
    },
    enabled: isAuthenticated,
  });

  const searches: SavedSearch[] = searchesData || [];

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) {
        refetch();
      }
    }, [isAuthenticated]),
  );

  const deleteMutation = useMutation({
    mutationFn: async (searchId: string) => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const list: SavedSearch[] = stored ? JSON.parse(stored) : [];
      const next = list.filter((s) => s.id !== searchId);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-searches'] });
      appAlert(t('common.success'), t('savedSearch.deletedMsg'));
    },
    onError: () => {
      appAlert(t('common.error'), t('savedSearch.deleteFailedMsg'));
    },
  });

  const toggleNotificationMutation = useMutation({
    mutationFn: async ({ searchId, notifyEnabled }: { searchId: string; notifyEnabled: boolean }) => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const list: SavedSearch[] = stored ? JSON.parse(stored) : [];
      const next = list.map((s) => (s.id === searchId ? { ...s, notifyEnabled } : s));
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-searches'] });
    },
  });

  const runSearch = (search: SavedSearch) => {
    router.push(`/(tabs)/search?${buildSearchParams(search)}`);
  };

  const handleDelete = (search: SavedSearch) => {
    appAlert(t('savedSearch.deleteTitle'), t('savedSearch.deleteConfirm', { name: search.name }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => deleteMutation.mutate(search.id) },
    ]);
  };

  return {
    isAuthenticated,
    maxSavedSearches,
    searches,
    isLoading,
    toggleNotificationMutation,
    runSearch,
    handleDelete,
  };
}

export type SavedSearchesController = ReturnType<typeof useSavedSearches>;
