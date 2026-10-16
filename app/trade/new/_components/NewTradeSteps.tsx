import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Chip, EmptyState, Divider, SectionCard, Spinner, Stepper, Text, Input, Textarea, ButtonRow } from '@/ui';

import { TradeAddressPicker } from '@/components/common';
import { TradePickCard } from '@/components/trade/TradePickCard';
import { AppImage } from '@/components/AppImage';
import { getProductEffectivePrice } from '@/utils/productPrice';
import { formatPrice } from '@/utils/format';
import { styles } from '../_lib/styles';
import { TradeCostPreviewCard } from '../../[id]/_components/TradeCostPreviewCard';
import type { Product } from '../_lib/types';
import type { NewTradeController } from '../_hooks/useNewTrade';
import { navigateTo } from '@/lib/navigation/goTo';

type StepProps = { f: NewTradeController };

// ---------------------------------------------------------------------------
// Steps indicator (1 · 2 · 3) — ortak `Stepper`, beyaz SectionCard içinde
// ---------------------------------------------------------------------------
export function StepIndicator({ step }: { step: number }) {
  const { t } = useTranslation();
  const labels = [t('trade.stepMyItems'), t('trade.stepWantedItems'), t('checkout.stepConfirm')];
  return (
    <SectionCard>
      <Stepper steps={labels} current={step - 1} />
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Step 1 — select my items
// ---------------------------------------------------------------------------
export function Step1MyItems({ f }: StepProps) {
  const { t } = useTranslation();
  return (
    <>
      <SectionCard title={t('trade.selectMyItemsTitle')}>
        {f.loadingMyProducts ? (
          <Spinner size="md" style={styles.spinner} />
        ) : f.myProducts?.length === 0 ? (
          <EmptyState placement="inline"
            icon="tag"
            title={t('trade.noListingsForTrade')}
            subtitle={t('emptyState.tradeListingsHint')}
            actionLabel={t('product.createListing')}
            onAction={() => navigateTo('/(tabs)/sell')}
          />
        ) : (
          f.myProducts?.map((product: Product) => (
            <TradePickCard
              key={product.id}
              product={product}
              selected={!!f.selectedMyItems.find((p) => p.id === product.id)}
              onToggle={() => f.toggleMyItem(product)}
            />
          ))
        )}
      </SectionCard>
    </>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — select their items + cash adjustment
// ---------------------------------------------------------------------------
export function Step2TheirItems({ f }: StepProps) {
  const { t } = useTranslation();
  return (
    <>
      <SectionCard title={t('trade.selectWantedItemsTitle')}>
        {f.loadingTheirProducts ? (
          <Spinner size="md" style={styles.spinner} />
        ) : f.theirProducts?.length === 0 ? (
          <EmptyState placement="inline"
            icon="arrows-right-left"
            title={t('trade.noProductsFromSeller')}
            subtitle={t('emptyState.tradeEligibleHint')}
          />
        ) : (
          f.theirProducts?.map((product: Product) => (
            <TradePickCard
              key={product.id}
              product={product}
              selected={!!f.selectedTheirItems.find((p) => p.id === product.id)}
              onToggle={() => f.toggleTheirItem(product)}
            />
          ))
        )}
      </SectionCard>

      {/* Cash Adjustment */}
      <SectionCard title={t('trade.cashDifferenceOptionalLabel')}>
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
          label={t('trade.amountLabelSymbol')}
          value={f.cashAmount}
          onChangeText={(v: string) => f.setCashAmount(v.replace(/[^\d.,]/g, ''))}
          keyboardType="numeric"
          containerStyle={styles.cashInput}
        />
      </SectionCard>
    </>
  );
}

// ---------------------------------------------------------------------------
// Step 3 — review & submit
// ---------------------------------------------------------------------------
/** Özet kartı: seçilen ürün satırları + toplam değer. */
function ItemsSummary({ title, items, total }: { title: string; items: Product[]; total: number }) {
  const { t } = useTranslation();
  return (
    <SectionCard title={title}>
      {items.map((product) => (
        <View key={product.id} style={styles.summaryItem}>
          <AppImage source={product.images} variant="card" style={styles.summaryImage} />
          <Text variant="bodySm" tone="heading" style={styles.summaryItemTitle} numberOfLines={1}>
            {product.title}
          </Text>
          <Text variant="bodySm" weight="semibold" style={styles.price}>
            {formatPrice(getProductEffectivePrice(product))}
          </Text>
        </View>
      ))}
      <Divider style={styles.summaryDivider} />
      <View style={styles.summaryRow}>
        <Text variant="bodySm" tone="muted">{t('trade.totalValueLabel')}</Text>
        <Text variant="bodySm" weight="bold" tone="heading">{formatPrice(total)}</Text>
      </View>
    </SectionCard>
  );
}

export function Step3Review({ f }: StepProps) {
  const { t } = useTranslation();
  return (
    <>
      <ItemsSummary title={t('trade.productsYouOffer')} items={f.selectedMyItems} total={f.myTotal} />
      <ItemsSummary title={t('trade.productsYouWant')} items={f.selectedTheirItems} total={f.theirTotal} />

      {/* Yeni takasta kilitli ödeme kavramı yok — kart hep çizilmeli.
          Prop zorunlu olduğu için bu karar burada AÇIKÇA yazılıyor. */}
      <TradeCostPreviewCard
        mine={f.costPreview?.initiator ?? null}
        theirs={f.costPreview?.receiver ?? null}
        lockedPaymentCount={0}
      />

      {/* Cash Summary */}
      {f.cashValue > 0 && (
        <SectionCard title={t('trade.cashDifferenceLine')}>
          <View style={styles.summaryRow}>
            <Text variant="bodySm" tone="muted">
              {f.cashDirection === 'offer' ? t('trade.youWillPayLabel') : t('trade.theyWillPay')}
            </Text>
            <Text variant="bodySm" weight="bold" style={styles.price}>
              {formatPrice(f.cashValue)}
            </Text>
          </View>
        </SectionCard>
      )}

      {/* Message */}
      <SectionCard title={t('trade.yourMessageOptionalLabel')}>
        <Textarea
          value={f.message}
          onChangeText={(v: string) => f.setMessage(v.slice(0, 500))}
          rows={3}
          placeholder={t('trade.messagePlaceholder')}
        />
        <Text variant="caption" tone="subtle" align="right">
          {f.message.length}/500
        </Text>
      </SectionCard>

      {/* Teslimat adresi (takas kabul edilince kargo bu adrese gelir) */}
      <SectionCard title={t('address.deliveryAddress')}>
        <TradeAddressPicker onChange={f.setTradeAddressId} />
      </SectionCard>

      {/* Trade Protection Info */}
      <Alert variant="success" icon="shield-check" title={t('trade.safeTradeTitle')}>
        {t('trade.safeTradeDesc')}
      </Alert>
    </>
  );
}

// ---------------------------------------------------------------------------
// Sabit alt bar (PageShell `footer`) — diğer form/akış ekranlarıyla aynı yerleşim
// ---------------------------------------------------------------------------
/**
 * Alt bar görünür mü? 1. adımda ilan yokken (ya da yüklenirken) bar YOK: yapılacak tek şey
 * "İlan Oluştur" (boş durumda). Diğer adımlarda "Geri" hep gerekli.
 */
export function newTradeFooterVisible(f: NewTradeController): boolean {
  if (f.step !== 1) return true;
  return !f.loadingMyProducts && (f.myProducts?.length ?? 0) > 0;
}

/**
 * Adım düğmeleri: 1. adım tek tam genişlik "Devam (n seçili)"; 2-3. adım [Geri][Devam / Gönder]
 * (`ButtonRow`, eşit genişlik). Kural: API en az 1 teklif edilen + 1 istenen ürün ister
 * (CreateTradeDto `ArrayMinSize(1)`) — seçim yoksa ilerleme/gönderme düğmesi pasif.
 */
export function NewTradeFooter({ f }: StepProps) {
  const { t } = useTranslation();
  const noMine = f.selectedMyItems.length === 0;
  const noTheirs = f.selectedTheirItems.length === 0;
  if (f.step === 1) {
    return (
      <Button
        variant="primary"
        size="lg"
        fullWidth
        title={t('trade.continueWithSelectedCount', { count: f.selectedMyItems.length })}
        disabled={noMine}
        onPress={() => f.setStep(2)}
        testID="new-trade-step1-continue"
      />
    );
  }
  return (
    <ButtonRow>
      <Button variant="outline" size="lg" title={t('common.back')} onPress={() => f.setStep(f.step - 1)} />
      {f.step === 2 ? (
        <Button
          variant="primary"
          size="lg"
          title={t('common.continueShort')}
          disabled={noTheirs}
          onPress={() => f.setStep(3)}
          testID="new-trade-step2-continue"
        />
      ) : (
        <Button
          variant="primary"
          size="lg"
          title={t('trade.sendTrade')}
          onPress={f.handleSubmit}
          isLoading={f.submitPending}
          disabled={f.submitPending || noMine || noTheirs}
          testID="new-trade-submit"
        />
      )}
    </ButtonRow>
  );
}
