import React from 'react';
import { View, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Modal, Button, Divider, Text, theme } from '@/ui';

import { styles } from '../_lib/styles';
import type { MyListingsController } from '../_hooks/useMyListings';

const { colors } = theme;

/** Per-listing action menu + delete confirmation dialog. */
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
                <Ionicons name="eye" size={20} color={colors.text.heading} />
                <Text style={styles.menuItemText}>{t('common.view')}</Text>
              </Pressable>
            )}
            {menu.status !== 'sold' && menu.status !== 'deleted' && menu.status !== 'suspended' && (
              <Pressable style={styles.menuItem} onPress={() => f.handleMenuAction('edit', menu)}>
                <Ionicons name="pencil" size={20} color={colors.text.heading} />
                <Text style={styles.menuItemText}>{t('common.edit')}</Text>
              </Pressable>
            )}
            {menu.status === 'active' && (
              <Pressable style={styles.menuItem} onPress={() => f.handleMenuAction('boost', menu)}>
                <Ionicons name="rocket" size={20} color={colors.warning[600]!} />
                <Text style={[styles.menuItemText, { color: colors.warning[700]! }]}>{t('listing.boostAction')}</Text>
              </Pressable>
            )}
            {menu.status === 'active' && (
              <Pressable style={styles.menuItem} onPress={() => f.handleMenuAction('deactivate', menu)}>
                <Ionicons name="pause-circle" size={20} color={colors.text.heading} />
                <Text style={styles.menuItemText}>{t('listing.deactivateAction')}</Text>
              </Pressable>
            )}
            {menu.status === 'inactive' && (
              <Pressable style={styles.menuItem} onPress={() => f.handleMenuAction('relist', menu)}>
                <Ionicons name="refresh" size={20} color={colors.text.heading} />
                <Text style={styles.menuItemText}>{t('listing.relistAction')}</Text>
              </Pressable>
            )}
            <Divider />
            <Pressable style={styles.menuItem} onPress={() => f.handleMenuAction('delete', menu)}>
              <Ionicons name="trash" size={20} color={colors.danger[600]!} />
              <Text style={[styles.menuItemText, { color: colors.danger[600]! }]}>{t('common.delete')}</Text>
            </Pressable>
          </View>
        )}
      </Modal>

      {/* Delete Confirmation Dialog */}
      <Modal
        isOpen={f.deleteDialogVisible}
        onClose={() => f.setDeleteDialogVisible(false)}
        title={t('product.deleteListing')}
      >
        <Text style={{ marginBottom: theme.spacing[4], color: colors.text.body }}>
          {t('listing.deleteConfirmNamed', { title: f.selectedListing?.title ?? '' })}
        </Text>
        <View style={styles.dialogActions}>
          <Button variant="ghost" title={t('common.cancel')} onPress={() => f.setDeleteDialogVisible(false)} />
          <Button
            variant="danger"
            title={t('common.delete')}
            isLoading={f.deleteMutation.isPending}
            onPress={() => f.selectedListing && f.deleteMutation.mutate(f.selectedListing.id)}
          />
        </View>
      </Modal>
    </>
  );
}
