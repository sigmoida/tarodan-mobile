import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { DateField, Divider, Input, ListRowCard, SectionCard, Spinner, Text, theme } from '@/ui';
import { formatPrice } from '@/utils/format';

import type { ListingFormController } from '../_hooks/useListingForm';
import { fieldStyles } from './fields';

const { colors, spacing } = theme;

type SectionProps = { f: ListingFormController };

/** Satış başına tahmini kesinti / net kazanç kutusu (web `PricingCard` alt kutusu). */
function CommissionPreview({ f }: SectionProps) {
  const { t } = useTranslation();
  if (!f.commissionLoading && !f.commissionPreview) return null;
  return (
    <ListRowCard direction="column" padding={3} gap={1.5} style={styles.commission}>
      <Text variant="label" tone="muted">
        {t('product.estimatedPerSale')}
      </Text>
      {f.commissionLoading ? (
        <Spinner size="sm" color={colors.text.subtle} style={styles.commissionSpinner} />
      ) : f.commissionPreview ? (
        <View>
          <Text variant="bodySm" tone="muted">
            {t('listing.platformFeeLine', { amount: formatPrice(f.commissionPreview.sellerFeeAmount) })}
          </Text>
          <Text variant="bodySm" weight="semibold" color={colors.success[800]}>
            {t('listing.netEarningLine', { amount: formatPrice(f.commissionPreview.sellerNetAmount) })}
          </Text>
        </View>
      ) : null}
    </ListRowCard>
  );
}

/**
 * Fiyatlandırma (web `PricingCard` + `DiscountCard`): fiyat, stok, indirim (fiyat + tarih
 * aralığı) ve komisyon önizlemesi.
 */
export function ListingPricingSection({ f }: SectionProps) {
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
      </View>

      <CommissionPreview f={f} />
    </SectionCard>
  );
}

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
});
