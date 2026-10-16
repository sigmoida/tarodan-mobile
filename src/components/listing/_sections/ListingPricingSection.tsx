import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { DateField, Divider, Input, ListRowCard, SectionCard, Spinner, Text, theme } from '@/ui';
import { formatPrice } from '@/utils/format';

import type { ListingFormController } from '../_hooks/useListingForm';
import { memoSection, type ListingFormKey } from '../_lib/memoSection';
import { fieldStyles } from './fields';
import { formatSaleDay } from '../_lib/sale';

const { colors, spacing } = theme;

type SectionProps = { f: ListingFormController };

/** Bu dosyadaki bölümün okuduğu controller alanları (memo karşılaştırması; bkz. `memoSection`). */
const KEYS: readonly ListingFormKey[] = [
  'commissionError',
  'commissionLoading',
  'commissionPreview',
  'discountPercent',
  'isEdit',
  'onPriceBlur',
  'onSalePriceBlur',
  'price',
  'priceError',
  'priceHint',
  'quantity',
  'reservedQty',
  'saleEndDate',
  'salePrice',
  'salePriceError',
  'saleStartDate',
  'saleStartsOn',
  'setPrice',
  'setQuantity',
  'setSaleEndDate',
  'setSalePrice',
  'setSaleStartDate',
];

function BreakdownRow({ label, value, tone }: { label: string; value: string; tone: 'default' | 'deduction' | 'net' }) {
  const net = tone === 'net';
  return (
    <View style={styles.row}>
      <Text variant="bodySm" tone={net ? 'heading' : 'muted'} weight={net ? 'semibold' : undefined} style={styles.rowLabel}>
        {label}
      </Text>
      <Text
        variant="bodySm"
        numberOfLines={1}
        tone={net ? 'success' : tone === 'deduction' ? 'danger' : 'heading'}
        weight={net ? 'semibold' : 'medium'}
        style={styles.rowValue}
      >
        {value}
      </Text>
    </View>
  );
}

/**
 * Satış başına özet (web `PricingCard` → `PricingBreakdown`): TAM İKİ SATIR —
 * satıcının üstlendiği kargo ücreti ve hak ediş. Komisyon/KDV/stopaj hak edişin
 * içinde. Kargo payı 0 ise satır gizlenmez (sıfır mı, hesaba katılmadı mı belli olsun).
 * Önizleme alınamazsa (ör. eşleşen komisyon kuralı yok) web'in hata metni.
 */
function CommissionPreview({ f }: SectionProps) {
  const { t } = useTranslation();
  const p = f.commissionPreview;
  if (!f.commissionLoading && !p && !f.commissionError) return null;
  return (
    <ListRowCard direction="column" padding={3} gap={1.5} style={styles.commission} testID="commission-preview">
      <Text variant="label" tone="muted">
        {t('product.estimatedPerSale')}
      </Text>
      {f.commissionLoading ? (
        <Spinner size="sm" color={colors.text.subtle} style={styles.commissionSpinner} />
      ) : f.commissionError ? (
        <Text variant="bodySm" tone="danger">
          {t('product.commissionRuleUnavailable')}
        </Text>
      ) : p ? (
        <View style={styles.rows}>
          <BreakdownRow
            label={t('product.shippingFee')}
            value={formatPrice(p.shippingAmount)}
            tone={p.shippingAmount > 0 ? 'deduction' : 'default'}
          />
          <BreakdownRow label={t('product.sellerEarning')} value={formatPrice(p.sellerNetAmount)} tone="net" />
        </View>
      ) : null}
    </ListRowCard>
  );
}

/**
 * Fiyatlandırma (web `PricingCard` + `DiscountCard`): fiyat, stok, indirim (fiyat + tarih
 * aralığı) ve komisyon önizlemesi.
 */
export const ListingPricingSection = memoSection(function ListingPricingSection({ f }: SectionProps) {
  const { t } = useTranslation();
  return (
    <SectionCard title={t('product.pricing')} bodyStyle={fieldStyles.body}>
      <Input
        label={t('listing.priceFieldLabel')}
        required
        value={f.price}
        onChangeText={f.setPrice}
        placeholder="0.00"
        keyboardType="decimal-pad"
        onBlur={f.onPriceBlur}
        error={f.priceError}
        helperText={f.priceHint}
        style={fieldStyles.flush}
      />

      <View>
        <Input
          label={t('product.stockQuantity')}
          value={f.quantity}
          onChangeText={f.setQuantity}
          placeholder={f.isEdit ? t('membership.unlimited') : '1'}
          keyboardType="number-pad"
          helperText={f.isEdit ? t('product.leaveEmptyUnlimitedStock') : t('product.quantityDefaultHint')}
          style={fieldStyles.flush}
        />
        {f.isEdit && f.reservedQty > 0 ? (
          <Text variant="caption" tone="warning" style={styles.reserved}>
            {t('listing.reservedHint', {
              reserved: f.reservedQty,
              available: Math.max(0, (Number(f.quantity) || 0) - f.reservedQty),
            })}
          </Text>
        ) : null}
      </View>

      {/* İndirim — create'te de gösterilir. `POST /products` indirim alanlarını
          kabul ediyor (delta 18 §2b) ve `buildSalePayload` zaten create yolunda
          da çağrılıyordu; yalnız bu kapı yüzünden satıcı ilanı önce açıp sonra
          düzenlemeden indirim eklemek zorunda kalıyordu. */}
      <Divider />
      <View>
        <Input
          label={`${t('product.discountedPrice')} (TL)`}
          value={f.salePrice}
          onChangeText={f.setSalePrice}
          placeholder={t('listing.salePricePlaceholder')}
          keyboardType="decimal-pad"
          onBlur={f.onSalePriceBlur}
          error={f.salePriceError}
          style={fieldStyles.flush}
        />
        {f.discountPercent > 0 ? (
          <Text variant="bodySm" weight="semibold" tone="success" style={styles.discountPercent}>
            {t('listing.discountPercentLabel', { percent: f.discountPercent })}
          </Text>
        ) : null}
      </View>
      <View>
        <DateField
          label={t('listing.saleStartLabel')}
          value={f.saleStartDate}
          onChange={f.setSaleStartDate}
          placeholder={t('auth.birthDatePlaceholder')}
        />
        <DateField
          label={t('listing.saleEndLabel')}
          value={f.saleEndDate}
          onChange={f.setSaleEndDate}
          placeholder={t('auth.birthDatePlaceholder')}
          minimumDate={f.saleStartDate ? new Date(f.saleStartDate) : undefined}
          containerStyle={fieldStyles.flush}
        />
        {f.saleStartsOn ? (
          <Text variant="caption" tone="info" style={styles.saleHint} testID="sale-starts-later">
            {t('listing.saleStartsOn', { date: formatSaleDay(f.saleStartsOn, t('common.dateLocale')) })}
          </Text>
        ) : null}
      </View>

      <CommissionPreview f={f} />
    </SectionCard>
  );
}, KEYS);

const styles = StyleSheet.create({
  reserved: {
    marginTop: spacing[1],
  },
  discountPercent: {
    marginTop: spacing[1.5],
  },
  commission: {
    backgroundColor: colors.surface.DEFAULT,
    borderColor: colors.border.subtle,
  },
  commissionSpinner: {
    alignSelf: 'flex-start',
  },
  rows: {
    gap: spacing[2],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[4],
  },
  rowLabel: {
    flexShrink: 1,
  },
  rowValue: {
    fontVariant: ['tabular-nums'],
  },
  saleHint: {
    marginTop: spacing[1.5],
  },
});
