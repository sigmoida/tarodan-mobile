import { useCallback, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { appAlert } from '@/ui';
import { useAuthStore } from '@/stores/authStore';
import type { ChipNameOptions } from '@/utils/activeFilterChips';
import type { ProductFilters } from '@/utils/productFilters';
import { buildSavedSearchDraft } from '../_lib/savedSearch';

/**
 * "Save this search" on the search screen: the canonical draft of the live filters, the sign-in
 * prompt for a guest, and the open state of `SaveSearchModal` (which owns the form and the save).
 * The button is disabled while `draft.isEmpty` (nothing but a sort), so `start` is a no-op then.
 */
export function useSaveSearch(filters: ProductFilters, names: ChipNameOptions) {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [open, setOpen] = useState(false);

  // The option lists are stable references (`useProductFilterOptions`); the `names` object is not.
  const { categories, brands, manufacturers, carModels } = names;
  const draft = useMemo(
    () => buildSavedSearchDraft(filters, { categories, brands, manufacturers, carModels }),
    [filters, categories, brands, manufacturers, carModels],
  );

  const start = useCallback(() => {
    if (draft.isEmpty) return;
    if (!isAuthenticated) {
      appAlert(t('savedSearch.saveTitle'), t('savedSearch.signInToSave'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.login'), onPress: () => router.push('/(auth)/login') },
      ]);
      return;
    }
    setOpen(true);
  }, [draft.isEmpty, isAuthenticated, t]);
  const close = useCallback(() => setOpen(false), []);

  return { draft, open, start, close };
}
