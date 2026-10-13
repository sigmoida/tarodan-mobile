import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Modal, Button, Spinner, Text, theme } from '@/ui';

import { formatPrice } from '@/utils/format';
import { styles } from '../_lib/styles';
import { useDiscountProducts } from '../_hooks/useDiscountProducts';

const { colors } = theme;

/** Multi-select product picker for product-scoped discounts. */
export function ProductPickerModal({
  visible,
  selectedIds,
  onChange,
  onClose,
}: {
  visible: boolean;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { products, isLoading } = useDiscountProducts(visible);
  return (
    <Modal isOpen={visible} onClose={onClose} title={t('discount.pickProducts')}>
      <ScrollView style={styles.dialogScroll}>
        {isLoading ? (
          <View style={{ paddingVertical: theme.spacing[6], alignItems: 'center' }}>
            <Spinner size="lg" />
          </View>
        ) : products.length === 0 ? (
          <Text style={styles.emptyProducts}>{t('discount.noActiveProducts')}</Text>
        ) : (
          products.map((p) => {
            const checked = selectedIds.includes(p.id);
            return (
              <Pressable
                key={p.id}
                style={styles.productRow}
                onPress={() =>
                  onChange(checked ? selectedIds.filter((id) => id !== p.id) : [...selectedIds, p.id])
                }
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
        <Button variant="primary" title={t('common.ok')} onPress={onClose} />
      </View>
    </Modal>
  );
}
