import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { collectionsApi } from '@/lib/api';
import { isServerOrNetworkFailure } from '@/lib/api/reauthError';
import { qk, useAppMutation } from '@/lib/query';
import { captureException } from '@/services/sentry';
import { confirm } from '@/ui';

/**
 * Owner removes one item (a listing or a custom item) from a collection, like web: a destructive
 * confirm dialog, `DELETE /collections/:id/items/:itemId`, a toast, and a refresh of the detail and
 * "my collections" queries. Used by the detail and the edit screens.
 */
export function useRemoveCollectionItem(collectionId: string) {
  const { t } = useTranslation();
  const mutation = useAppMutation((itemId: string) => collectionsApi.removeItem(collectionId, itemId), {
    invalidates: [qk.collections.detail(collectionId), qk.collections.mine, qk.collections.all],
    success: t('collection.productRemoved'),
    error: t('collection.productRemoveFailed'),
    onError: (error) => {
      if (isServerOrNetworkFailure(error)) {
        captureException(error, { level: 'error', tags: { flow: 'collection.removeItem' }, extra: { collectionId } });
      }
    },
  });

  /** Asks first; the mutation fires after the dialog has closed (iOS-safe, `confirm` contract). */
  const { mutate } = mutation;
  const requestRemove = useCallback(async (itemId: string) => {
    const confirmed = await confirm({
      title: t('collection.removeProduct'),
      message: t('collection.removeProductConfirm'),
      confirmLabel: t('common.remove'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (confirmed) mutate(itemId);
  }, [t, mutate]);

  return {
    requestRemove,
    /** The item being removed, for its control's busy state. */
    removingId: mutation.isPending ? mutation.variables : undefined,
  };
}
