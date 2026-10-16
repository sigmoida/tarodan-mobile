import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Icon, ProductBadge, theme } from '@/ui';
import { getProductBadges } from '../_lib/badges';
import type { PriceInfo } from '../_lib/display';

const { colors, spacing, iconSize } = theme;

/** Takas rozeti ikonu — `ProductCard` ile aynı. */
const TRADE_ICON = <Icon name="arrows-right-left" size={iconSize.sm} color={colors.text.inverted} />;

/**
 * Fiyatın hemen altındaki rozet satırı (tek yatay satır, sığmazsa sarar): %İndirim → Takas.
 * Hangi rozetlerin çıkacağı `getProductBadges` (tek kaynak); hiçbiri yoksa hiçbir şey çizmez.
 * Web `ProductStaticInfoView` ile aynı mantık/sıra; sponsorlu/kampanya detayda yoktur.
 */
export function ProductBadgeRow({
  price,
  tradeBadge,
}: {
  price: PriceInfo;
  tradeBadge: boolean;
}) {
  const { t } = useTranslation();
  const badges = getProductBadges(price, tradeBadge);
  if (!badges.discountPct && !badges.trade) return null;
  return (
    <View style={styles.row} testID="product-badge-row">
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
