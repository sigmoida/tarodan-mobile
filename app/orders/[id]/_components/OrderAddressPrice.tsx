import { useTranslation } from 'react-i18next';
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SectionCard, Text, theme } from '@/ui';
import { formatPrice } from '../_lib/format';
import type { OrderDetail } from '../_lib/types';

const { colors, spacing } = theme;

/** Shipping address; hidden on a digital order (web `ShippingAddressCard`). */
export function OrderAddressCard({ order, isDigitalOrder }: { order: OrderDetail; isDigitalOrder: boolean }) {
  const { t } = useTranslation();
  if (isDigitalOrder) return null;
  const a = order.shippingAddress;
  return (
    <SectionCard title={t('checkout.shippingAddress')} bodyStyle={styles.address}>
      {a ? (
        <>
          <Text variant="body" weight="medium">{a.fullName}</Text>
          <Text variant="bodySm" tone="muted">{a.address}</Text>
          <Text variant="bodySm" tone="muted">
            {a.district ? `${a.district} / ${a.city}` : a.city}
            {(a.zipCode ?? a.postalCode) ? ` ${a.zipCode ?? a.postalCode}` : ''}
          </Text>
          <Text variant="bodySm" tone="muted">
            {t('sale.phoneLabel', { phone: a.phone })}
          </Text>
        </>
      ) : (
        <Text variant="bodySm" tone="muted">
          {t('order.addressNotSetYet')}
        </Text>
      )}
    </SectionCard>
  );
}

/** Payment summary (web `OrderSummaryCard`): lines and total; no shipping row on a digital order. */
export function OrderPriceSummary({ order, isDigitalOrder }: { order: OrderDetail; isDigitalOrder: boolean }) {
  const { t } = useTranslation();
  const p = order.pricing;
  return (
    <SectionCard title={t('order.paymentSummary')} bodyStyle={styles.rows}>
      <Row label={t('order.productAmount')} value={formatPrice(p?.subtotal ?? order.product.price)} />
      {!isDigitalOrder && <Row label={t('product.shipping')} value={formatPrice(order.shippingCost)} />}
      {(p?.buyerFeeAmount ?? order.buyerFeeAmount ?? 0) > 0 && (
        <Row label={t('order.platformFee')} value={formatPrice(p?.buyerFeeAmount ?? order.buyerFeeAmount ?? 0)} />
      )}
      {(p?.buyerServiceTaxAmount ?? 0) > 0 && (
        <Row label={t('order.serviceVat')} value={formatPrice(p!.buyerServiceTaxAmount!)} />
      )}
      {order.isSeller && ((p?.sellerFeeAmount ?? order.sellerFeeAmount ?? 0) > 0 || p?.sellerNetAmount != null) && (
        <>
          <Row label={t('product.platformDeduction')} value={formatPrice(p?.sellerFeeAmount ?? order.sellerFeeAmount ?? 0)} />
          <Row label={t('product.netToYou')} value={formatPrice(p?.sellerNetAmount ?? 0)} success />
        </>
      )}
      <View style={styles.rule} />
      <View style={styles.row}>
        <Text variant="h3" tone="heading">{t('common.total')}</Text>
        <Text variant="h3" weight="bold" style={{ color: theme.priceColor.detail }}>{formatPrice(order.totalAmount)}</Text>
      </View>
    </SectionCard>
  );
}

function Row({ label, value, success = false }: { label: string; value: string; success?: boolean }) {
  const style = success ? { color: colors.success[600]! } : undefined;
  return (
    <View style={styles.row}>
      <Text variant="bodySm" tone="muted" style={style}>{label}</Text>
      <Text variant="bodySm" weight={success ? 'semibold' : 'medium'} style={style}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  address: { gap: spacing[0.5] },
  rows: { gap: spacing[3] },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing[3] },
  rule: { height: 1, backgroundColor: colors.border.DEFAULT },
});
