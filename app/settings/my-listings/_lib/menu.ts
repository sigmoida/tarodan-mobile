import type { TFunction } from 'i18next';
import type { ActionSheetAction } from '@/ui';
import { isExpiredListing, type Listing } from './types';

/** İlan eylem menüsünün satırları (ActionSheet `actions` + `handleMenuAction` anahtarları). */
export type ListingMenuAction = 'view' | 'edit' | 'boost' | 'deactivate' | 'relist' | 'delete';

/**
 * İlan eylem menüsü — durum → görünür satırlar TEK yerde (UI yalnız çizer). Sil yıkıcıdır
 * (kırmızı, en altta). `canBoost`: dijital satın alma açıkken "Öne çıkar" (UpgradeCta ile aynı kapı).
 * Satırın `onPress`'i sheet TAMAMEN kapandıktan sonra çalışır (ActionSheet → runAfterClose).
 */
export function buildListingMenuActions(
  listing: Listing,
  t: TFunction,
  onAction: (action: ListingMenuAction, listing: Listing) => void,
  canBoost: boolean,
): ActionSheetAction[] {
  const row = (
    key: ListingMenuAction,
    label: string,
    extra?: Pick<ActionSheetAction, 'destructive'>,
  ): ActionSheetAction => ({
    key,
    label,
    testID: `listing-menu-${key}`,
    onPress: () => onAction(key, listing),
    ...extra,
  });

  const { status } = listing;
  const actions: ActionSheetAction[] = [];
  if (status !== 'deleted') actions.push(row('view', t('common.view')));
  if (status !== 'sold' && status !== 'deleted' && status !== 'suspended') {
    actions.push(row('edit', t('common.edit')));
  }
  if (status === 'active' && canBoost) actions.push(row('boost', t('listing.boostAction')));
  if (status === 'active') actions.push(row('deactivate', t('listing.deactivateAction')));
  if (status === 'inactive') {
    actions.push(
      row('relist', isExpiredListing(listing) ? t('profile.expiredListings.renew') : t('listing.relistAction')),
    );
  }
  actions.push(row('delete', t('common.delete'), { destructive: true }));
  return actions;
}
