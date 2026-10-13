import { useTranslation } from 'react-i18next';
import React from 'react';
import { View, Pressable } from 'react-native';
import { AppImage } from '@/components/AppImage';
import { router } from 'expo-router';
import { Button, SectionCard, StatusBadge, Text, theme, ButtonRow } from '@/ui';

import { getOrderProductImageUri } from '@/utils/orderProductImage';
import { styles } from '../_lib/ordersStyles';
import {
  useOrderStatusConfig,
  badgeStatusOf,
  canRateOrder,
  formatOrderDate,
  formatOrderPrice,
  type Order,
} from '../_lib/ordersStatus';

/**
 * Tek sipariş kartı (web `OrderGroupCard` satırı): sipariş no + durum rozeti, ürün satırı
 * (görsel · başlık · satıcı · tarih · fiyat), alt şeritte takip / ayrıntı. Grup içinde `compact`.
 */
export function OrderCard({
  order,
  compact = false,
  onRate,
}: {
  order: Order;
  compact?: boolean;
  onRate: (type: 'product' | 'seller', order: Order) => void;
}) {
  const { t } = useTranslation();
  const statusConfig = useOrderStatusConfig();
  const open = () => router.push(`/orders/${order.id}`);
  return (
    <SectionCard bodyStyle={styles.card}>
      <View style={styles.cardHead}>
        <Text variant="caption" tone="muted">
          {t('sale.orderNumberTitle', { number: order.orderNumber })}
        </Text>
        <StatusBadge status={badgeStatusOf(order)} config={statusConfig} size="sm" />
      </View>

      <Pressable onPress={open} style={styles.line} accessibilityRole="button">
        <AppImage
          source={getOrderProductImageUri(order.product, 'card')}
          recyclingKey={String(order.id)}
          style={compact ? styles.imageSm : styles.image}
        />
        <View style={styles.info}>
          <Text variant="body" weight="medium" tone="heading" numberOfLines={2}>
            {order.product.title}
          </Text>
          <Text variant="bodySm" tone="muted">
            {t('refund.sellerLabel', { name: order.seller.displayName })}
          </Text>
          <Text variant="caption" tone="subtle">
            {formatOrderDate(order.createdAt)}
          </Text>
        </View>
        <Text variant="body" weight="semibold" style={{ color: theme.priceColor.detail }}>
          {formatOrderPrice(order.totalAmount)}
        </Text>
      </Pressable>

      {/* Takip + ayrıntı */}
      <View style={styles.cardFoot}>
        <View style={styles.footActions}>
          {order.trackingNumber && order.status === 'shipped' ? (
            <Button
              variant="outline"
              size="sm"
              title={t('order.track')}
              onPress={() => router.push(`/order-track?orderNumber=${order.orderNumber}`)}
            />
          ) : null}
        </View>
        <Button variant="outline" size="sm" title={t('common.details')} onPress={open} />
      </View>

      {/* Değerlendirme — teslim/tamamlanmış siparişte (yeni escrow: ayrı "Teslim Aldım"
          onay butonu yok; satıcıya ödeme teslim+14 gün sonra otomatik serbest kalır) */}
      {canRateOrder(order) ? (
        <ButtonRow>
          {!order.hasProductRating && (
            <Button
              variant="outline"
              size="sm"
              title={t('order.rateProduct')}
              onPress={() => onRate('product', order)}
            />
          )}
          {!order.hasSellerRating && (
            <Button
              variant="outline"
              size="sm"
              title={t('order.rateSeller')}
              onPress={() => onRate('seller', order)}
            />
          )}
        </ButtonRow>
      ) : null}
    </SectionCard>
  );
}
