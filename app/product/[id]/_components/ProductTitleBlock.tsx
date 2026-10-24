import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text, theme, Icon } from '@/ui';
import { formatPrice } from '@/utils/format';
import type { PriceInfo } from '../_lib/display';
import type { Product } from '../_lib/types';
import { ProductBadgeRow } from './ProductBadgeRow';
import { ProductNotice } from './ProductNotice';
import { useProductDetailLayout } from '../_lib/layout';

const { colors, spacing, iconSize, priceColor } = theme;

/**
 * Başlık, fiyat bloğu, rozet satırı, durum uyarısı ve sayaçlar (web `ProductStaticInfoView`): h1 bold;
 * indirimdeyse üstü çizili eski fiyat; fiyat primary-500 bold (detay rengi); fiyatın hemen altında
 * rozet satırı (%İndirim → Takas, bkz. `ProductBadgeRow`), onun altında durum/stok uyarısı;
 * görüntülenme + beğeni. Teklif/takas girişi yalnız alt bardaki satırda (çip yok).
 * Tablets (`useProductDetailLayout().split`): the badge row and the counters sit to the right of
 * the price, on its baseline row.
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
  const { split } = useProductDetailLayout();
  const priceBlock = (
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
  );
  const badges = <ProductBadgeRow price={price} tradeBadge={tradeBadge} />;
  const counters = (
    <View style={styles.counters} testID="product-counters">
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
  );

  return (
    <View style={styles.block}>
      <Text variant="h2" accessibilityRole="header">
        {product.title}
      </Text>
      {split ? (
        <>
          <View style={styles.priceRow} testID="product-price-row">
            {priceBlock}
            <View style={styles.priceAside}>
              {badges}
              {counters}
            </View>
          </View>
          <ProductNotice product={product} />
        </>
      ) : (
        <>
          {priceBlock}
          {badges}
          <ProductNotice product={product} />
          {counters}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing[4] },
  priceBlock: { gap: spacing[1] },
  struck: { textDecorationLine: 'line-through' },
  counters: { flexDirection: 'row', alignItems: 'center', gap: spacing[4] },
  counter: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  // Tablets: price left, badges + counters beside it on the price's bottom line.
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap', gap: spacing[4] },
  priceAside: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing[4], paddingBottom: spacing[1] },
});
