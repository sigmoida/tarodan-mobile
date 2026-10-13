import React, { memo } from 'react';
import { View } from 'react-native';
import { Checkbox } from '@/ui';
import { formatPrice } from '@/utils/format';
import { styles } from '../_lib/styles';
import type { MyProduct } from '../_lib/types';

/** Ürün seçici satırı: onay kutusu + "başlık · fiyat" (eski modal satırıyla aynı). */
export const ProductPickRow = memo(function ProductPickRow({
  product,
  checked,
  onToggle,
}: {
  product: MyProduct;
  checked: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <View style={styles.productRow}>
      <Checkbox
        checked={checked}
        onChange={() => onToggle(product.id)}
        label={`${product.title} · ${formatPrice(product.price)}`}
        testID={`discount-product-${product.id}`}
      />
    </View>
  );
});
