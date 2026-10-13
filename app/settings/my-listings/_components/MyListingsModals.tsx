import React from 'react';
import { View, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Modal, Divider, Text } from '@/ui';
import { ListingRemovalModal } from '@/components/listing/ListingRemovalModal';
import UpgradeCta from '@/components/UpgradeCta';

import { styles } from '../_lib/styles';
import type { MyListingsController } from '../_hooks/useMyListings';
import { isExpiredListing } from '../_lib/types';

/** Per-listing action menu (ikonsuz metin satırları) + kaldırma nedeni penceresi (silme / pasife alma). */
export function MyListingsModals({ f }: { f: MyListingsController }) {
  const { t } = useTranslation();
  const menu = f.actionMenuListing;
  return (
    <>
      {/* Action Menu Modal */}
      <Modal
        isOpen={f.actionMenuListing !== null}
        onClose={() => f.setActionMenuListing(null)}
        title={t('common.actions')}
      >
        {menu && (
          <View>
            {menu.status !== 'deleted' && (
              <Pressable style={styles.menuItem} onPress={() => f.handleMenuAction('view', menu)}>
                <Text variant="body">{t('common.view')}</Text>
              </Pressable>
            )}
            {menu.status !== 'sold' && menu.status !== 'deleted' && menu.status !== 'suspended' && (
              <Pressable style={styles.menuItem} onPress={() => f.handleMenuAction('edit', menu)}>
                <Text variant="body">{t('common.edit')}</Text>
              </Pressable>
            )}
            {menu.status === 'active' && (
              <UpgradeCta>
                <Pressable style={styles.menuItem} onPress={() => f.handleMenuAction('boost', menu)}>
                  <Text variant="body" tone="warning">
                    {t('listing.boostAction')}
                  </Text>
                </Pressable>
              </UpgradeCta>
            )}
            {menu.status === 'active' && (
              <Pressable style={styles.menuItem} onPress={() => f.handleMenuAction('deactivate', menu)}>
                <Text variant="body">{t('listing.deactivateAction')}</Text>
              </Pressable>
            )}
            {menu.status === 'inactive' && (
              <Pressable style={styles.menuItem} onPress={() => f.handleMenuAction('relist', menu)}>
                <Text variant="body">
                  {isExpiredListing(menu) ? t('profile.expiredListings.renew') : t('listing.relistAction')}
                </Text>
              </Pressable>
            )}
            <Divider />
            <Pressable style={styles.menuItem} onPress={() => f.handleMenuAction('delete', menu)}>
              <Text variant="body" tone="danger">
                {t('common.delete')}
              </Text>
            </Pressable>
          </View>
        )}
      </Modal>

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
