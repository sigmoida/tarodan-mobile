import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Alert, Button, ButtonRow, Chip, Input, SectionCard, Text, Textarea, theme, Icon } from '@/ui';

import { formatPrice } from '@/utils/format';
import { styles } from '../_lib/styles';
import { TradeProductPicker } from './TradeProductPicker';
import { nextCashInput } from '../../../_lib/cash';
import type { TradeCounterController } from '../_hooks/useTradeCounter';

const { colors } = theme;

/** Notice, product pickers, cash, message, summary (SectionCard dizisi). Düğmeler alt barda (`TradeCounterFooter`). */
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
        isLoading={f.loadingMyProducts}
        selected={f.selectedMine}
        toggle={f.toggleMine}
        hasMore={f.myHasMore}
        isLoadingMore={f.myLoadingMore}
        onLoadMore={f.loadMoreMine}
        showMoreTestID="counter-my-show-more"
      />

      <View style={styles.swapWrap}>
        <Icon name="arrows-up-down" size={theme.iconSize.lg} color={colors.primary[600]!} />
      </View>

      <TradeProductPicker
        title={t('trade.counterTheirItemsTitle')}
        subtitle={t('trade.counterTheirItemsSubtitle', { name: f.amIInitiator ? trade.receiverName : trade.initiatorName })}
        products={f.theirProducts}
        isLoading={f.loadingTheirProducts}
        selected={f.selectedTheirs}
        toggle={f.toggleTheirs}
        hasMore={f.theirHasMore}
        isLoadingMore={f.theirLoadingMore}
        onLoadMore={f.loadMoreTheirs}
        showMoreTestID="counter-their-show-more"
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
          onChangeText={(v: string) => f.setCashAmount((prev) => nextCashInput(prev, v))}
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
    </>
  );
}

/**
 * Sabit alt bar (PageShell `footer`): [Vazgeç][Karşı Teklif Gönder] — diğer akış ekranlarıyla aynı
 * yerleşim. API iki tarafta da en az 1 ürün ister: biri boşsa gönder pasif.
 */
export function TradeCounterFooter({ f }: { f: TradeCounterController }) {
  const { t } = useTranslation();
  return (
    <ButtonRow>
      {/* Üst bardaki geri okuyla aynı işleyici: geçmiş yoksa (bildirim / derin bağlantı) /trades'e döner. */}
      <Button variant="outline" size="lg" title={t('trade.dispute.cancelCta')} onPress={f.handleBack} />
      <Button
        variant="primary"
        size="lg"
        title={t('trade.sendCounterOffer')}
        onPress={f.handleSubmit}
        testID="trade-counter-submit"
        isLoading={f.submitPending}
        disabled={f.submitPending || f.selectedMine.length === 0 || f.selectedTheirs.length === 0}
      />
    </ButtonRow>
  );
}
