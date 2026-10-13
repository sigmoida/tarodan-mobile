import React from 'react';
import { StyleSheet, View, type StyleProp, type TextStyle } from 'react-native';
import { Text, type TextProps } from '@/ui';
import { formatPrice } from '@/utils/format';
import {
  getProductEffectivePrice,
  getProductOriginalPriceForDisplay,
  isProductOnSaleDisplay,
  type ProductPriceFields,
} from '@/utils/productPrice';

export interface ProductPriceProps extends Pick<TextProps, 'variant' | 'tone' | 'weight'> {
  product: ProductPriceFields;
  /** Güncel fiyatın stili (kart stilinden gelir). */
  style?: StyleProp<TextStyle>;
}

/**
 * Kart/detay fiyat satırı — web `ProductCard` ile aynı kural: güncel satış
 * fiyatı (`price`) kalın, indirimdeyse eski fiyat ÜSTTE üstü çizili. Biçim
 * `formatPrice` ("1.234,50 TL"); kural `@/utils/productPrice` (web paritesi).
 */
export function ProductPrice({ product, style, variant, tone, weight }: ProductPriceProps) {
  const effective = getProductEffectivePrice(product);
  const original = getProductOriginalPriceForDisplay(product);
  const onSale = isProductOnSaleDisplay(product) && original > effective;
  return (
    <View style={styles.wrap}>
      {onSale ? (
        <Text variant="bodySm" tone="subtle" style={styles.old} testID="product-price-old">
          {formatPrice(original)}
        </Text>
      ) : null}
      <Text variant={variant} tone={tone} weight={weight} style={style} testID="product-price">
        {formatPrice(effective)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'flex-start' },
  old: { textDecorationLine: 'line-through' },
});
