import React from 'react';
import { View, Image } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Chip, Divider, Spinner, Text, Input, Textarea, theme } from '@/ui';

import { TradeAddressPicker } from '@/components/common';
import { getImageUrl } from '@/utils/imageUrl';
import { getProductEffectivePrice } from '@/utils/productPrice';
import { formatPrice } from '@/utils/format';
import { styles } from '../_lib/styles';
import { TradeProductCard } from './TradeProductCard';
import { TradeCostPreviewCard } from '../../[id]/_components/TradeCostPreviewCard';
import type { Product } from '../_lib/types';
import type { NewTradeController } from '../_hooks/useNewTrade';

const { colors } = theme;

type StepProps = { f: NewTradeController };

// ---------------------------------------------------------------------------
// Steps indicator (1 · 2 · 3)
// ---------------------------------------------------------------------------
export function StepIndicator({ step }: { step: number }) {
  const { t } = useTranslation();
  const labels = [t('trade.stepMyItems'), t('trade.stepWantedItems'), t('checkout.stepConfirm')];
  return (
    <View style={styles.stepsContainer}>
      {[1, 2, 3].map((s) => (
        <View key={s} style={styles.stepWrapper}>
          <View style={[styles.stepCircle, step >= s && styles.stepCircleActive]}>
            <Text style={[styles.stepNumber, step >= s && styles.stepNumberActive]}>{s}</Text>
          </View>
          <Text style={[styles.stepLabel, step >= s && styles.stepLabelActive]}>
            {labels[s - 1]}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Step 1 — select my items
// ---------------------------------------------------------------------------
export function Step1MyItems({ f }: StepProps) {
  const { t } = useTranslation();
  return (
    <View>
      <Text variant="h3" style={styles.sectionTitle}>
        {t('trade.selectMyItemsTitle')}
      </Text>

      {f.loadingMyProducts ? (
        <View style={{ marginTop: theme.spacing[8] }}>
          <Spinner size="md" />
        </View>
      ) : f.myProducts?.length === 0 ? (
        <Card style={styles.emptyCard}>
          <View style={styles.emptyContent}>
            <Ionicons name="pricetag-outline" size={48} color={colors.text.subtle} />
            <Text variant="body" style={styles.emptyText}>
              {t('trade.noListingsForTrade')}
            </Text>
            <Button variant="outline" title={t('product.createListing')} onPress={() => router.push('/(tabs)/sell')} style={{ alignSelf: 'center' }} />
          </View>
        </Card>
      ) : (
        f.myProducts?.map((product: Product) => (
          <TradeProductCard
            key={product.id}
            product={product}
            isSelected={!!f.selectedMyItems.find((p) => p.id === product.id)}
            onToggle={() => f.toggleMyItem(product)}
          />
        ))
      )}

      <View style={styles.stepActions}>
        <Button variant="primary" title={t('trade.continueWithSelectedCount', { count: f.selectedMyItems.length })} onPress={() => f.setStep(2)} />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — select their items + cash adjustment
// ---------------------------------------------------------------------------
export function Step2TheirItems({ f }: StepProps) {
  const { t } = useTranslation();
  return (
    <View>
      <Text variant="h3" style={styles.sectionTitle}>
        {t('trade.selectWantedItemsTitle')}
      </Text>

      {f.loadingTheirProducts ? (
        <View style={{ marginTop: theme.spacing[8] }}>
          <Spinner size="md" />
        </View>
      ) : f.theirProducts?.length === 0 ? (
        <Card style={styles.emptyCard}>
          <View style={styles.emptyContent}>
            <Ionicons name="swap-horizontal" size={48} color={colors.text.subtle} />
            <Text variant="body" style={styles.emptyText}>
              {t('trade.noProductsFromSeller')}
            </Text>
          </View>
        </Card>
      ) : (
        f.theirProducts?.map((product: Product) => (
          <TradeProductCard
            key={product.id}
            product={product}
            isSelected={!!f.selectedTheirItems.find((p) => p.id === product.id)}
            onToggle={() => f.toggleTheirItem(product)}
          />
        ))
      )}

      {/* Cash Adjustment */}
      <Card style={styles.cashCard}>
        <Text variant="label" style={styles.cashTitle}>{t('trade.cashDifferenceOptionalLabel')}</Text>
        <View style={styles.cashDirectionRow}>
          <Chip
            label={t('trade.iWillPay')}
            selected={f.cashDirection === 'offer'}
            onPress={() => f.setCashDirection('offer')}
            variant="primary"
            style={styles.cashChip}
          />
          <Chip
            label={t('trade.theyWillPay')}
            selected={f.cashDirection === 'request'}
            onPress={() => f.setCashDirection('request')}
            variant="primary"
            style={styles.cashChip}
          />
        </View>
        <Input
          label={t('trade.amountLabelSymbol')}
          value={f.cashAmount}
          onChangeText={(v: string) => f.setCashAmount(v.replace(/[^\d.,]/g, ''))}
          keyboardType="numeric"
          containerStyle={styles.cashInput}
        />
      </Card>

      <View style={styles.stepActions}>
        <Button variant="outline" title={t('common.back')} onPress={() => f.setStep(1)} style={{ marginRight: theme.spacing[3] }} />
        <Button
          variant="primary"
          title={t('common.continueShort')}
          disabled={f.selectedTheirItems.length === 0}
          onPress={() => f.setStep(3)}
        />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Step 3 — review & submit
// ---------------------------------------------------------------------------
export function Step3Review({ f }: StepProps) {
  const { t } = useTranslation();
  return (
    <View>
      <Text variant="h3" style={styles.sectionTitle}>
        {t('trade.tradeSummaryTitle')}
      </Text>

      {/* My Items Summary */}
      <Card style={styles.summaryCard}>
        <Text variant="label" style={styles.summaryTitle}>
          {t('trade.productsYouOffer')}
        </Text>
        {f.selectedMyItems.map((product) => (
          <View key={product.id} style={styles.summaryItem}>
            <Image source={{ uri: getImageUrl(product.images) }} style={styles.summaryImage} />
            <Text variant="caption" style={styles.summaryItemTitle} numberOfLines={1}>
              {product.title}
            </Text>
            <Text variant="caption" style={styles.summaryItemPrice}>
              {formatPrice(getProductEffectivePrice(product))}
            </Text>
          </View>
        ))}
        <Divider style={styles.summaryDivider} />
        <View style={styles.summaryTotal}>
          <Text variant="body">{t('trade.totalValueLabel')}:</Text>
          <Text variant="label" style={styles.totalPrice}>
            {formatPrice(f.myTotal)}
          </Text>
        </View>
      </Card>

      {/* Their Items Summary */}
      <Card style={styles.summaryCard}>
        <Text variant="label" style={styles.summaryTitle}>
          {t('trade.productsYouWant')}
        </Text>
        {f.selectedTheirItems.map((product) => (
          <View key={product.id} style={styles.summaryItem}>
            <Image source={{ uri: getImageUrl(product.images) }} style={styles.summaryImage} />
            <Text variant="caption" style={styles.summaryItemTitle} numberOfLines={1}>
              {product.title}
            </Text>
            <Text variant="caption" style={styles.summaryItemPrice}>
              {formatPrice(getProductEffectivePrice(product))}
            </Text>
          </View>
        ))}
        <Divider style={styles.summaryDivider} />
        <View style={styles.summaryTotal}>
          <Text variant="body">{t('trade.totalValueLabel')}:</Text>
          <Text variant="label" style={styles.totalPrice}>
            {formatPrice(f.theirTotal)}
          </Text>
        </View>
      </Card>

      {/* Yeni takasta kilitli ödeme kavramı yok — kart hep çizilmeli.
          Prop zorunlu olduğu için bu karar burada AÇIKÇA yazılıyor. */}
      <TradeCostPreviewCard
        mine={f.costPreview?.initiator ?? null}
        theirs={f.costPreview?.receiver ?? null}
        lockedPaymentCount={0}
      />

      {/* Cash Summary */}
      {f.cashValue > 0 && (
        <Card style={styles.summaryCard}>
          <Text variant="label" style={styles.summaryTitle}>{t('trade.cashDifferenceLine')}</Text>
          <Text variant="body">
            {f.cashDirection === 'offer' ? `${t('trade.youWillPayLabel')}: ` : `${t('trade.theyWillPay')}: `}
            <Text style={{ color: colors.primary[600]!, fontWeight: 'bold' }}>
              {formatPrice(f.cashValue)}
            </Text>
          </Text>
        </Card>
      )}

      {/* Message */}
      <Textarea
        label={t('trade.yourMessageOptionalLabel')}
        value={f.message}
        onChangeText={(v: string) => f.setMessage(v.slice(0, 500))}
        rows={3}
        containerStyle={styles.messageInput}
        placeholder={t('trade.messagePlaceholder')}
      />
      <Text variant="caption" tone="subtle" style={styles.charCount}>
        {f.message.length}/500
      </Text>

      {/* Teslimat adresi (takas kabul edilince kargo bu adrese gelir) */}
      <View style={styles.messageInput}>
        <TradeAddressPicker label={t('address.deliveryAddress')} onChange={f.setTradeAddressId} />
      </View>

      {/* Trade Protection Info */}
      <Card style={styles.protectionCard}>
        <View style={styles.protectionContent}>
          <Ionicons name="shield-checkmark" size={24} color={colors.success[600]!} />
          <View style={styles.protectionText}>
            <Text variant="label">{t('trade.safeTradeTitle')}</Text>
            <Text variant="caption" style={styles.protectionDesc}>
              {t('trade.safeTradeDesc')}
            </Text>
          </View>
        </View>
      </Card>

      <View style={styles.stepActions}>
        <Button variant="outline" title={t('common.back')} onPress={() => f.setStep(2)} style={{ marginRight: theme.spacing[3] }} />
        <Button
          variant="primary"
          title={t('trade.sendTrade')}
          onPress={f.handleSubmit}
          isLoading={f.createTradeMutation.isPending}
          disabled={f.createTradeMutation.isPending}
        />
      </View>
    </View>
  );
}
