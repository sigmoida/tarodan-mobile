import React from 'react';
import { View, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, Checkbox, EmptyState, Modal, Spinner, Text } from '@/ui';

import { formatPrice } from '@/utils/format';
import { styles } from '../_lib/styles';
import { useDiscountProducts } from '../_hooks/useDiscountProducts';

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
    <Modal
      isOpen={visible}
      onClose={onClose}
      title={t('discount.pickProducts')}
      scrollable={false}
      footer={<Button variant="primary" fullWidth title={t('common.ok')} onPress={onClose} />}
    >
      <ScrollView style={styles.dialogScroll}>
        {isLoading ? (
          <View style={styles.pickerLoading}>
            <Spinner size="lg" />
          </View>
        ) : products.length === 0 ? (
          <EmptyState placement="inline" icon="cube" title={t('discount.noActiveProducts')} subtitle={t('home.noProductsYetHint')} />
        ) : (
          products.map((p) => {
            const checked = selectedIds.includes(p.id);
            return (
              <View key={p.id} style={styles.productRow}>
                <Checkbox
                  checked={checked}
                  onChange={() =>
                    onChange(checked ? selectedIds.filter((id) => id !== p.id) : [...selectedIds, p.id])
                  }
                  label={`${p.title} · ${formatPrice(p.price)}`}
                />
              </View>
            );
          })
        )}
      </ScrollView>
    </Modal>
  );
}
