import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Card, Text, theme } from '@/ui';
import { formatPrice } from '@/utils/format';
import type { TradePaymentQuoteSide } from '@/lib/api';
import type { TFn } from '../_lib/types';

/**
 * Kabul ÖNCESİ canlı maliyet dökümü. Tutarlar tahminidir, kabul anında kilitlenir
 * (`cashPayments` snapshot'ı) — bunu `costPreviewHint` metni söyler.
 * `feeLines` denetim detayıdır ve BASILMAZ.
 */
export function TradeCostPreviewCard({
  mine,
  theirs,
}: {
  mine: TradePaymentQuoteSide | null;
  theirs: TradePaymentQuoteSide | null;
}) {
  const { t } = useTranslation();
  if (!mine || !theirs) return null;

  return (
    <Card style={styles.card}>
      <Text variant="body" style={styles.title}>{t('trade.costPreviewTitle')}</Text>
      <Side label={t('trade.costPreviewYou')} side={mine} t={t} />
      <Side label={t('trade.costPreviewThem')} side={theirs} t={t} />
      <Text variant="caption" tone="muted" style={styles.hint}>{t('trade.costPreviewHint')}</Text>
    </Card>
  );
}

function Side({
  label,
  side,
  t,
}: {
  label: string;
  side: TradePaymentQuoteSide;
  t: TFn;
}) {
  return (
    <View style={styles.side}>
      <Text variant="caption" style={styles.sideLabel}>{label}</Text>
      <Row label={t('trade.serviceFee')} amount={side.serviceFee} />
      <Row label={t('trade.shippingFee')} amount={side.shipping} />
      {side.cashDifference > 0 ? (
        <Row label={t('trade.cashDifferenceLine')} amount={side.cashDifference} />
      ) : null}
      <View style={styles.totalRow}>
        <Text variant="caption" style={styles.sideLabel}>{t('trade.paymentTotal')}</Text>
        <Text variant="body" style={styles.totalValue}>{formatPrice(side.total)}</Text>
      </View>
    </View>
  );
}

function Row({ label, amount }: { label: string; amount: number }) {
  return (
    <View style={styles.row}>
      <Text variant="caption" tone="muted">{label}</Text>
      <Text variant="caption">{formatPrice(amount)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { margin: theme.spacing[4], marginTop: theme.spacing[0], backgroundColor: theme.colors.surface.DEFAULT },
  title: { fontWeight: '600' },
  side: { marginTop: theme.spacing[3], gap: theme.spacing[1] },
  sideLabel: { fontWeight: '600' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing[1],
    paddingTop: theme.spacing[1],
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.DEFAULT,
  },
  totalValue: { fontWeight: 'bold' },
  hint: { marginTop: theme.spacing[2] },
});
