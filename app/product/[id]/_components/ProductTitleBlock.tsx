import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Badge, Text, theme, Icon } from '@/ui';
import { formatPrice } from '@/utils/format';
import type { PriceInfo } from '../_lib/display';
import type { Product } from '../_lib/types';

const { colors, spacing, iconSize, priceColor } = theme;

/**
 * Başlık, fiyat bloğu ve sayaçlar (web `ProductStaticInfoView`): h1 bold, satıldıysa "Satıldı"
 * rozeti; indirimdeyse üstü çizili eski fiyat + "%x indirim"; fiyat primary-500 bold (detay rengi);
 * görüntülenme + beğeni.
 */
export function ProductTitleBlock({
  product,
  price,
  favoriteCount,
}: {
  product: Product;
  price: PriceInfo;
  favoriteCount: number;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.block}>
      <View style={styles.titleRow}>
        <Text variant="h1" style={styles.title} accessibilityRole="header">
          {product.title}
        </Text>
        {product.status === 'sold' ? (
          <Badge variant="danger" size="sm">
            {t('product.sold')}
          </Badge>
        ) : null}
      </View>

      <View style={styles.priceBlock}>
        {price.onSale ? (
          <View style={styles.oldRow}>
            <Text variant="h2" weight="regular" tone="subtle" style={styles.struck} testID="product-price-old">
              {formatPrice(price.originalPrice)}
            </Text>
            {price.discountPct > 0 ? (
              <Badge variant="danger" appearance="solid" size="sm">
                %{price.discountPct} {t('product.discount')}
              </Badge>
            ) : null}
          </View>
        ) : null}
        <Text variant="h1" weight="bold" color={priceColor.detail} testID="product-price">
          {formatPrice(price.effectivePrice)}
        </Text>
      </View>

      <View style={styles.counters}>
        <View style={styles.counter}>
          <Icon name="eye" size={iconSize.sm} color={colors.primary[500]} />
          <Text variant="bodySm">
            {product.viewCount || 0} {t('product.views')}
          </Text>
        </View>
        <View style={styles.counter}>
          <Icon name="heart" variant="solid" size={iconSize.sm} color={colors.danger[500]} />
          <Text variant="bodySm">
            {favoriteCount} {t('product.likes')}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing[4] },
  titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing[3] },
  title: { flexShrink: 1 },
  priceBlock: { gap: spacing[1] },
  oldRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  struck: { textDecorationLine: 'line-through' },
  counters: { flexDirection: 'row', alignItems: 'center', gap: spacing[4] },
  counter: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
});
