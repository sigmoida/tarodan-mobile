import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Chip, Input, SectionCard, Text, Textarea, theme } from '@/ui';

import { formatPrice } from '@/utils/format';
import { styles } from '../_lib/styles';
import { TradeProductPicker } from './TradeProductPicker';
import type { TradeCounterController } from '../_hooks/useTradeCounter';

const { colors } = theme;

/** Notice, product pickers, cash, message, summary, and submit/cancel buttons (SectionCard dizisi). */
export function TradeCounterBody({ f }: { f: TradeCounterController }) {
  const { t } = useTranslation();
  const { trade } = f;
  if (!trade) return null;

  return (
    <>
      <Alert variant="info">{t('trade.counterOfferNotice')}</Alert>

      <TradeProductPicker
        title={t('trade.counterMyItemsTitle')}
        subtitle={t('trade.counterMyItemsSubtitle')}
        products={f.myProducts}
        selected={f.selectedMine}
        toggle={f.toggleMine}
      />

      <View style={styles.swapWrap}>
        <Ionicons name="swap-vertical" size={theme.iconSize.lg} color={colors.primary[600]!} />
      </View>

      <TradeProductPicker
        title={t('trade.counterTheirItemsTitle')}
        subtitle={t('trade.counterTheirItemsSubtitle', { name: f.amIInitiator ? trade.receiverName : trade.initiatorName })}
        products={f.theirProducts}
        selected={f.selectedTheirs}
        toggle={f.toggleTheirs}
      />

      <SectionCard title={t('trade.cashDifferenceLine')}>
        <View style={styles.chipsRow}>
          <Chip
            label={t('trade.iWillPay')}
            selected={f.cashDirection === 'offer'}
            onPress={() => f.setCashDirection('offer')}
            variant="primary"
            style={styles.chip}
          />
          <Chip
            label={t('trade.theyWillPay')}
            selected={f.cashDirection === 'request'}
            onPress={() => f.setCashDirection('request')}
            variant="primary"
            style={styles.chip}
          />
        </View>
        <Input
          label={t('trade.amountLabelTL')}
          value={f.cashAmount}
          onChangeText={(v: string) => f.setCashAmount(v.replace(/[^\d.]/g, ''))}
          keyboardType="numeric"
          containerStyle={styles.cashInput}
        />
      </SectionCard>

      <SectionCard title={t('trade.messageOptionalLabel')}>
        <Textarea
          value={f.message}
          onChangeText={(v: string) => f.setMessage(v.slice(0, 500))}
          rows={3}
          placeholder={t('trade.counterMessagePlaceholderLong')}
          containerStyle={styles.messageInput}
        />
        <Text variant="caption" tone="subtle" align="right">{f.message.length}/500</Text>
      </SectionCard>

      {/* Summary */}
      <SectionCard title={t('trade.summaryTitle')} bodyStyle={styles.summary}>
        <View style={styles.summaryRow}>
          <Text variant="bodySm" tone="muted">{t('trade.myTotalGiven')}</Text>
          <Text variant="bodySm" weight="bold" tone="heading">{formatPrice(f.myTotal)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text variant="bodySm" tone="muted">{t('trade.myTotalWanted')}</Text>
          <Text variant="bodySm" weight="bold" tone="heading">{formatPrice(f.theirTotal)}</Text>
        </View>
        {f.cashValue > 0 ? (
          <View style={styles.summaryRow}>
            <Text variant="bodySm" tone="muted">
              {f.cashDirection === 'offer' ? t('trade.willPayCashShort') : t('trade.willReceiveCashShort')}
            </Text>
            <Text variant="bodySm" weight="bold" style={{ color: theme.priceColor.detail }}>
              {formatPrice(f.cashValue)}
            </Text>
          </View>
        ) : null}
        <Text variant="caption" tone="muted" align="center">
          {t('trade.counterSummaryHint', { myCount: f.selectedMine.length, theirCount: f.selectedTheirs.length })}
        </Text>
      </SectionCard>

      <Button
        variant="primary"
        fullWidth
        title={t('trade.sendCounterOffer')}
        onPress={f.handleSubmit}
        testID="trade-counter-submit"
        isLoading={f.submitPending}
        disabled={f.submitPending || (f.selectedMine.length === 0 && f.selectedTheirs.length === 0)}
      />

      <Button variant="ghost" title={t('trade.dispute.cancelCta')} onPress={() => router.back()} />
    </>
  );
}
