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
  /** Güncel fiyatın testID'si (eski fiyat `${testID}-old`). Aynı ekranda iki fiyat varsa ayırır. */
  testID?: string;
  /**
   * Tek satır: fiyat sarmaz, sığmazsa küçülür (dar alanlar — ör. ürün detayının sabit alt barı).
   */
  singleLine?: boolean;
}

/**
 * Kart/detay fiyat satırı — web `ProductCard` ile aynı kural: güncel satış
 * fiyatı (`price`) kalın, indirimdeyse eski fiyat ÜSTTE üstü çizili. Biçim
 * `formatPrice` ("1.234,50 TL"); kural `@/utils/productPrice` (web paritesi).
 */
export function ProductPrice({
  product,
  style,
  variant,
  tone,
  weight,
  testID = 'product-price',
  singleLine = false,
}: ProductPriceProps) {
  const effective = getProductEffectivePrice(product);
  const original = getProductOriginalPriceForDisplay(product);
  const onSale = isProductOnSaleDisplay(product) && original > effective;
  const fit = singleLine
    ? { numberOfLines: 1, adjustsFontSizeToFit: true, minimumFontScale: PRICE_MIN_FONT_SCALE }
    : null;
  return (
    <View style={styles.wrap}>
      {onSale ? (
        <Text variant="bodySm" tone="subtle" style={styles.old} testID={`${testID}-old`} {...fit}>
          {formatPrice(original)}
        </Text>
      ) : null}
      <Text variant={variant} tone={tone} weight={weight} style={style} testID={testID} {...fit}>
        {formatPrice(effective)}
      </Text>
    </View>
  );
}

/** `singleLine`'da sığmayan fiyat en çok bu orana kadar küçülür. */
const PRICE_MIN_FONT_SCALE = 0.6;

const styles = StyleSheet.create({
  wrap: { alignItems: 'flex-start' },
  old: { textDecorationLine: 'line-through' },
});
