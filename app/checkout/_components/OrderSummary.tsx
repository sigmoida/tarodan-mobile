import React from 'react';
import { View } from 'react-native';
import { Divider, Text, theme } from '@/ui';
import { formatPrice } from '@/utils/format';
import { styles } from '../_lib/styles';

const { colors } = theme;

/**
 * Ödeme detayı özeti — her adımda görünür.
 * Üç satır `pricing.summary`'den AYNEN gelir (`productAmount`/`shippingAmount`/
 * `serviceFeeAmount`); istemci tarafında hesaplanan/yuvarlanan hiçbir para
 * değeri yoktur. `serviceFeeAmount` hizmet bedeli + TÜM alıcı hizmet KDV'sini
 * içerir — ayrı bir KDV satırı basılmaz.
 */
export function OrderSummary({
  itemCount,
  productAmount,
  shippingCost,
  effectiveShippingCity,
  serviceFeeAmount,
  discount = 0,
  couponCode,
  total,
}: {
  itemCount: number;
  productAmount: number;
  shippingCost: number;
  effectiveShippingCity: string;
  serviceFeeAmount: number;
  discount?: number;
  couponCode?: string;
  total: number;
}) {
  return (
    <View style={styles.orderSummary}>
      <Text style={styles.orderSummaryTitle}>Ödeme Detayı</Text>
      <View style={styles.orderSummaryRow}>
        <Text style={styles.orderSummaryLabel}>Ara Toplam ({itemCount} ürün)</Text>
        <Text style={styles.orderSummaryValue}>{formatPrice(productAmount)}</Text>
      </View>
      <View style={styles.orderSummaryRow}>
        <Text style={styles.orderSummaryLabel}>Kargo (Sürat)</Text>
        <Text style={styles.orderSummaryValue}>{effectiveShippingCity ? formatPrice(shippingCost) : 'İl seçin'}</Text>
      </View>
      {serviceFeeAmount > 0 ? (
        <View style={styles.orderSummaryRow}>
          <Text style={styles.orderSummaryLabel}>Platform Hizmet Bedeli</Text>
          <Text style={styles.orderSummaryValue}>{formatPrice(serviceFeeAmount)}</Text>
        </View>
      ) : null}
      {discount > 0 ? (
        <View style={styles.orderSummaryRow} testID="order-summary-discount">
          <Text style={styles.orderSummaryLabel}>
            İndirim{couponCode ? ` (${couponCode})` : ''}
          </Text>
          <Text style={[styles.orderSummaryValue, { color: colors.success[600]! }]}>
            -{formatPrice(discount)}
          </Text>
        </View>
      ) : null}
      <Divider style={{ marginVertical: 12 }} />
      <View style={styles.orderSummaryRow}>
        <Text style={styles.orderTotalLabel}>Toplam</Text>
        <Text style={styles.orderTotalValue}>{formatPrice(total)}</Text>
      </View>
    </View>
  );
}
