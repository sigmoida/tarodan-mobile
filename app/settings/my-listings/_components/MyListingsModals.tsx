import React from 'react';
import { useTranslation } from 'react-i18next';
import { ActionSheet } from '@/ui';
import { ListingRemovalModal } from '@/components/listing/ListingRemovalModal';
import { CAN_BUY_DIGITAL } from '@/lib/purchases';

import type { MyListingsController } from '../_hooks/useMyListings';
import { buildListingMenuActions } from '../_lib/menu';

/**
 * İlan eylem menüsü (ActionSheet; sil yıkıcı) + kaldırma nedeni penceresi (silme / pasife alma).
 * Menü satırları sheet TAMAMEN kapandıktan sonra çalışır; kaldırma penceresi / öne çıkar
 * penceresi / kota uyarısı bu yüzden zamanlayıcı olmadan güvenle açılır (src/ui/CLAUDE.md › iOS modal rule).
 */
export function MyListingsModals({ f }: { f: MyListingsController }) {
  const { t } = useTranslation();
  const menu = f.actionMenuListing;
  return (
    <>
      <ActionSheet
        isOpen={f.actionMenuOpen}
        onClose={f.closeActionMenu}
        title={t('common.actions')}
        actions={menu ? buildListingMenuActions(menu, t, f.handleMenuAction, CAN_BUY_DIGITAL) : []}
        cancelLabel={t('common.cancel')}
        testID="listing-menu-sheet"
      />

      {/* Kaldırma nedeni: silme onayı + pasife alma — neden zorunlu (web ile aynı) */}
      <ListingRemovalModal
        action={f.removalTarget?.action ?? 'delete'}
        visible={f.removalOpen}
        listingTitle={f.removalTarget?.listing.title}
        onClose={f.closeRemoval}
        onSubmit={f.submitRemoval}
      />
    </>
  );
}
