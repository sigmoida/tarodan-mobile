import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Badge, SectionCard, Text, theme } from '@/ui';
import { formatPrice } from '@/utils/format';
import type { Trade } from '../_lib/types';

const { colors, spacing } = theme;

export function TradeCashCard({
  trade,
  userId,
  otherPartyName,
  cashPaid,
  cashCommission,
  cashTotal,
  isV2,
}: {
  trade: Trade;
  userId?: string;
  otherPartyName: string;
  cashPaid: boolean;
  cashCommission: number;
  cashTotal: number;
  isV2: boolean;
}) {
  const { t } = useTranslation();
  // v2'de ödeme dökümü TradePaymentsCard'ta; bu kart yalnız v1 takaslar içindir.
  if (isV2) return null;
  if (!(trade.cashAmount != null && Number(trade.cashAmount) > 0)) return null;

  return (
    <SectionCard style={styles.card} bodyStyle={styles.body}>
      <View style={{ flex: 1, gap: spacing[0.5] }}>
        <Text variant="caption" tone="muted">{t('trade.cashDifferenceLine')}</Text>
        <Text variant="h2" weight="bold" style={{ color: colors.success[700]! }}>
          {formatPrice(Math.abs(Number(trade.cashAmount ?? 0)))}
        </Text>
        {cashCommission > 0 && cashTotal > 0 ? (
          <Text variant="caption" tone="muted">
            {t('trade.commissionLine')}: {formatPrice(cashTotal)}
          </Text>
        ) : null}
        <Text variant="caption" tone="muted">
          {trade.cashPayerId === userId
            ? t('trade.iWillPay')
            : t('trade.willPayBy', { name: otherPartyName })}
        </Text>
      </View>
      {cashPaid ? <Badge variant="success" size="sm">{t('trade.paymentPaid')}</Badge> : null}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.success[50]!, borderColor: colors.success[200]! },
  body: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
});
