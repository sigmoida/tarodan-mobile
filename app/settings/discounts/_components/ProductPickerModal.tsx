import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Modal, Button, Spinner, Text, theme } from '@/ui';

import { formatPrice } from '@/utils/format';
import { styles } from '../_lib/styles';
import type { DiscountsController } from '../_hooks/useDiscounts';

const { colors } = theme;

/** Multi-select product picker for product-scoped discounts. */
export function ProductPickerModal({ f }: { f: DiscountsController }) {
  const { t } = useTranslation();
  const { form, setForm } = f;
  return (
    <Modal
      isOpen={f.productPickerOpen}
      onClose={() => f.setProductPickerOpen(false)}
      title={t('discount.pickProducts')}
    >
      <ScrollView style={styles.dialogScroll}>
        {f.productsQuery.isLoading ? (
          <View style={{ paddingVertical: theme.spacing[6], alignItems: 'center' }}>
            <Spinner size="lg" />
          </View>
        ) : f.products.length === 0 ? (
          <Text style={styles.emptyProducts}>{t('discount.noActiveProducts')}</Text>
        ) : (
          f.products.map((p) => {
            const checked = form.targetProductIds.includes(p.id);
            return (
              <Pressable
                key={p.id}
                style={styles.productRow}
                onPress={() => {
                  const next = checked
                    ? form.targetProductIds.filter((id) => id !== p.id)
                    : [...form.targetProductIds, p.id];
                  setForm({ ...form, targetProductIds: next });
                }}
              >
                <Ionicons
                  name={checked ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={checked ? colors.primary[600]! : colors.text.subtle}
                />
                <View style={{ flex: 1, marginLeft: theme.spacing[3] }}>
                  <Text style={styles.productTitle} numberOfLines={1}>
                    {p.title}
                  </Text>
                  <Text style={styles.productPrice}>{formatPrice(p.price)}</Text>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
      <View style={styles.dialogActions}>
        <Button variant="primary" title={t('common.ok')} onPress={() => f.setProductPickerOpen(false)} />
      </View>
    </Modal>
  );
}
