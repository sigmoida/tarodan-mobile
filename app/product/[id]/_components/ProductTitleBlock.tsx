import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text, theme, Icon } from '@/ui';
import { formatPrice } from '@/utils/format';
import type { PriceInfo } from '../_lib/display';
import type { Product } from '../_lib/types';
import { ProductBadgeRow } from './ProductBadgeRow';
import { ProductNotice } from './ProductNotice';

const { colors, spacing, iconSize, priceColor } = theme;

/**
 * Başlık, fiyat bloğu, rozet satırı, durum uyarısı ve sayaçlar (web `ProductStaticInfoView`): h1 bold;
 * indirimdeyse üstü çizili eski fiyat; fiyat primary-500 bold (detay rengi); fiyatın hemen altında
 * rozet satırı (Satıldı → %İndirim → Takas, bkz. `ProductBadgeRow`), onun altında durum/stok uyarısı;
 * görüntülenme + beğeni. Teklif/takas girişi yalnız alt bardaki satırda (çip yok).
 */
export function ProductTitleBlock({
  product,
  price,
  favoriteCount,
  tradeBadge,
}: {
  product: Product;
  price: PriceInfo;
  favoriteCount: number;
  /** Takas rozeti görünsün mü (`getOfferTradeAvailability().tradeBadge`). */
  tradeBadge: boolean;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.block}>
      <Text variant="h2" accessibilityRole="header">
        {product.title}
      </Text>

      <View style={styles.priceBlock}>
        {price.onSale ? (
          <Text variant="body" weight="regular" tone="subtle" style={styles.struck} testID="product-price-old">
            {formatPrice(price.originalPrice)}
          </Text>
        ) : null}
        <Text variant="h1" weight="bold" color={priceColor.detail} testID="product-price">
          {formatPrice(price.effectivePrice)}
        </Text>
      </View>

      <ProductBadgeRow product={product} price={price} tradeBadge={tradeBadge} />
      <ProductNotice product={product} />

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
  priceBlock: { gap: spacing[1] },
  struck: { textDecorationLine: 'line-through' },
  counters: { flexDirection: 'row', alignItems: 'center', gap: spacing[4] },
  counter: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
});
