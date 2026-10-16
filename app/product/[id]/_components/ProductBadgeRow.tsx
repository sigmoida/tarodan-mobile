import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Badge, Icon, ProductBadge, theme } from '@/ui';
import { getProductBadges } from '../_lib/badges';
import type { PriceInfo } from '../_lib/display';
import type { Product } from '../_lib/types';

const { colors, spacing, iconSize } = theme;

/** Takas rozeti ikonu — `ProductCard` ile aynı. */
const TRADE_ICON = <Icon name="arrows-right-left" size={iconSize.sm} color={colors.text.inverted} />;

/**
 * Fiyatın hemen altındaki rozet satırı (tek yatay satır, sığmazsa sarar): Satıldı → %İndirim → Takas.
 * Hangi rozetlerin çıkacağı `getProductBadges` (tek kaynak); hiçbiri yoksa hiçbir şey çizmez.
 * Web `ProductStaticInfoView` ile aynı mantık/sıra; sponsorlu/kampanya detayda yoktur.
 */
export function ProductBadgeRow({
  product,
  price,
  tradeBadge,
}: {
  product: Product;
  price: PriceInfo;
  tradeBadge: boolean;
}) {
  const { t } = useTranslation();
  const badges = getProductBadges(product, price, tradeBadge);
  if (!badges.sold && !badges.discountPct && !badges.trade) return null;
  return (
    <View style={styles.row} testID="product-badge-row">
      {badges.sold ? (
        <Badge testID="product-badge-sold" variant="danger" size="sm">
          {t('product.sold')}
        </Badge>
      ) : null}
      {badges.discountPct ? (
        <ProductBadge testID="product-badge-sale" variant="sale">
          %{badges.discountPct}
        </ProductBadge>
      ) : null}
      {badges.trade ? (
        <ProductBadge testID="product-badge-trade" variant="trade" icon={TRADE_ICON}>
          {t('product.tradeShort')}
        </ProductBadge>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing[2] },
});
