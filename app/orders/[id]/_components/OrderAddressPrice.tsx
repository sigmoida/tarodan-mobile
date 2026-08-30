import { useTranslation } from 'react-i18next';
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Divider, theme } from '@/ui';
import { formatPrice } from '../_lib/format';
import type { OrderDetail } from '../_lib/types';

const { colors } = theme;

/** Teslimat adresi — üyelik/dijital siparişte gizli. */
export function OrderAddressCard({ order, isMembershipOrder }: { order: OrderDetail; isMembershipOrder: boolean }) {
  const { t } = useTranslation();
  if (isMembershipOrder) return null;
  const a = order.shippingAddress;
  return (
    <Card variant="elevated" style={styles.card}>
      <Text variant="label" style={styles.sectionTitle}>{t('checkout.shippingAddress')}</Text>
      {a ? (
        <>
          <Text>{a.fullName}</Text>
          <Text variant="caption" style={styles.addressText}>{a.address}</Text>
          <Text variant="caption" style={styles.addressText}>
            {a.district ? `${a.district} / ${a.city}` : a.city}
            {(a.zipCode ?? a.postalCode) ? ` ${a.zipCode ?? a.postalCode}` : ''}
          </Text>
          <Text variant="caption" style={styles.addressText}>
            {t('sale.phoneLabel', { phone: a.phone })}
          </Text>
        </>
      ) : (
        <Text variant="caption" style={styles.addressText}>
          {t('order.addressNotSetYet')}
        </Text>
      )}
    </Card>
  );
}

/** Ödeme özeti. */
export function OrderPriceSummary({ order, isMembershipOrder }: { order: OrderDetail; isMembershipOrder: boolean }) {
  const { t } = useTranslation();
  const p = order.pricing;
  return (
    <Card variant="elevated" style={styles.card}>
      <Text variant="label" style={styles.sectionTitle}>{t('order.paymentSummary')}</Text>
      <View style={styles.priceRow}>
        <Text>{t('order.productAmount')}</Text>
        <Text>{formatPrice(p?.subtotal ?? order.product.price)}</Text>
      </View>
      {!isMembershipOrder && (
        <View style={styles.priceRow}>
          <Text>{t('product.shipping')}</Text>
          <Text>{formatPrice(order.shippingCost)}</Text>
        </View>
      )}
      {(p?.buyerFeeAmount ?? order.buyerFeeAmount ?? 0) > 0 && (
        <View style={styles.priceRow}>
          <Text>{t('order.platformFee')}</Text>
          <Text>{formatPrice(p?.buyerFeeAmount ?? order.buyerFeeAmount ?? 0)}</Text>
        </View>
      )}
      {(p?.buyerServiceTaxAmount ?? 0) > 0 && (
        <View style={styles.priceRow}>
          <Text>{t('order.serviceVat')}</Text>
          <Text>{formatPrice(p!.buyerServiceTaxAmount!)}</Text>
        </View>
      )}
      {order.isSeller && ((p?.sellerFeeAmount ?? order.sellerFeeAmount ?? 0) > 0 || p?.sellerNetAmount != null) && (
        <>
          <View style={styles.priceRow}>
            <Text>{t('product.platformDeduction')}</Text>
            <Text>{formatPrice(p?.sellerFeeAmount ?? order.sellerFeeAmount ?? 0)}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={{ color: colors.success[600], fontWeight: '600' }}>{t('product.netToYou')}</Text>
            <Text style={{ color: colors.success[600], fontWeight: '600' }}>{formatPrice(p?.sellerNetAmount ?? 0)}</Text>
          </View>
        </>
      )}
      <Divider style={{ marginVertical: theme.spacing[2] }} />
      <View style={styles.priceRow}>
        <Text variant="h3">{t('common.total')}</Text>
        <Text variant="h3" style={styles.totalPrice}>{formatPrice(order.totalAmount)}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: theme.spacing[3] },
  sectionTitle: { marginBottom: theme.spacing[3], color: colors.text.heading },
  addressText: { color: colors.text.muted, marginTop: theme.spacing[0.5] },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing[2] },
  totalPrice: { color: colors.primary[600]!, fontWeight: 'bold' },
});
