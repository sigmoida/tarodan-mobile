import React from 'react';
import { View, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Button, Card, Chip, Divider, Text, Input, Textarea, theme } from '@/ui';

import { ThemedRefreshControl } from '@/components/common';
import { formatPrice } from '@/utils/format';
import { styles } from '../_lib/styles';
import { TradeProductPicker } from './TradeProductPicker';
import type { TradeCounterController } from '../_hooks/useTradeCounter';

const { colors } = theme;

/** Notice, product pickers, cash, message, summary, and submit/cancel buttons. */
export function TradeCounterBody({ f }: { f: TradeCounterController }) {
  const { t } = useTranslation();
  const { trade } = f;
  if (!trade) return null;

  return (
    <ScrollView
      contentContainerStyle={styles.scrollBody}
      refreshControl={<ThemedRefreshControl refreshing={f.refreshing} onRefresh={f.onRefresh} />}
    >
      <View style={styles.noticeCard}>
        <Ionicons name="information-circle" size={18} color={colors.info[600]!} />
        <Text style={styles.noticeText}>
          {t('trade.counterOfferNotice')}
        </Text>
      </View>

      <TradeProductPicker
        title={t('trade.counterMyItemsTitle')}
        subtitle={t('trade.counterMyItemsSubtitle')}
        products={f.myProducts}
        selected={f.selectedMine}
        toggle={f.toggleMine}
      />

      <View style={styles.swapWrap}>
        <View style={styles.swapCircle}>
          <Ionicons name="swap-vertical" size={20} color={colors.primary[600]!} />
        </View>
      </View>

      <TradeProductPicker
        title={t('trade.counterTheirItemsTitle')}
        subtitle={t('trade.counterTheirItemsSubtitle', { name: f.amIInitiator ? trade.receiverName : trade.initiatorName })}
        products={f.theirProducts}
        selected={f.selectedTheirs}
        toggle={f.toggleTheirs}
      />

      <Card style={styles.card}>
        <Text style={styles.section}>{t('trade.cashDifferenceLine')}</Text>
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
      </Card>

      <Card style={styles.card}>
        <Text style={styles.section}>{t('trade.messageOptionalLabel')}</Text>
        <Textarea
          value={f.message}
          onChangeText={(v: string) => f.setMessage(v.slice(0, 500))}
          rows={3}
          placeholder={t('trade.counterMessagePlaceholderLong')}
          containerStyle={styles.messageInput}
        />
        <Text style={styles.charCount}>{f.message.length}/500</Text>
      </Card>

      {/* Summary */}
      <Card style={styles.card}>
        <Text style={styles.section}>{t('trade.summaryTitle')}</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{t('trade.myTotalGiven')}</Text>
          <Text style={styles.summaryValue}>{formatPrice(f.myTotal)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{t('trade.myTotalWanted')}</Text>
          <Text style={styles.summaryValue}>{formatPrice(f.theirTotal)}</Text>
        </View>
        {f.cashValue > 0 ? (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              {f.cashDirection === 'offer' ? t('trade.willPayCashShort') : t('trade.willReceiveCashShort')}
            </Text>
            <Text style={[styles.summaryValue, { color: colors.primary[600]! }]}>
              {formatPrice(f.cashValue)}
            </Text>
          </View>
        ) : null}
        <Divider style={{ marginVertical: theme.spacing[2] }} />
        <Text style={styles.summaryHint}>
          {t('trade.counterSummaryHint', { myCount: f.selectedMine.length, theirCount: f.selectedTheirs.length })}
        </Text>
      </Card>

      <Button
        variant="primary"
        title={t('trade.sendCounterOffer')}
        onPress={f.handleSubmit}
        isLoading={f.counterMutation.isPending}
        disabled={f.counterMutation.isPending || (f.selectedMine.length === 0 && f.selectedTheirs.length === 0)}
        style={styles.submitBtn}
      />

      <Button variant="ghost" title={t('trade.dispute.cancelCta')} onPress={() => router.back()} />
    </ScrollView>
  );
}
