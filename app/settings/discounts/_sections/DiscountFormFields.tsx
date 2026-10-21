import React from 'react';
import { View } from 'react-native';
import { Controller } from 'react-hook-form';
import { Button, Chip, DateField, Switch, Text } from '@/ui';
import { FormInput } from '@/ui/form';
import type { MessageKey } from '@/i18n/lib';

import { styles } from '../_lib/styles';
import { isQuantityType, type DiscountType } from '../_lib/types';
import type { DiscountFormController } from '../_hooks/useDiscountForm';

const TYPE_CHIPS: Array<{ type: DiscountType; labelKey: MessageKey }> = [
  { type: 'percentage', labelKey: 'discount.typePercent' },
  { type: 'fixed_amount', labelKey: 'discount.typeFixed' },
  { type: 'bogo', labelKey: 'discount.typeBogo' },
  { type: 'bulk_quantity', labelKey: 'discount.typeBulk' },
];

const digitsOnly = (v: string) => v.replace(/[^0-9]/g, '');

/**
 * İndirim formunun alanları (eski modal gövdesinden aynen): ad, açıklama, kod
 * (adet koşullu türde yok), tür çipleri, türe göre değer/adet alanları, kapsam
 * + ürün seçici girişi, geçerlilik tarihleri (DateField), limitler, iki Switch.
 * `<Form>` bağlamında çizilir; durum `useDiscountForm`'da.
 */
export function DiscountFormFields({ f }: { f: DiscountFormController }) {
  const { t, form, set, setType, setScope, openProductPicker } = f;
  const [type, scope, targetProductIds, isStackable, isActive] = form.watch([
    'type',
    'scope',
    'targetProductIds',
    'isStackable',
    'isActive',
  ]);
  const errors = form.formState.errors;

  return (
    <>
      <FormInput name="name" label={t('discount.nameLabel')} containerStyle={styles.input} />
      <FormInput
        name="description"
        label={t('discount.descriptionLabel')}
        multiline
        numberOfLines={2}
        containerStyle={styles.input}
      />
      {isQuantityType(type) ? (
        <Text variant="bodySm" tone="muted" style={styles.sectionLabel}>{t('discount.autoCampaignNote')}</Text>
      ) : (
        <FormInput
          name="code"
          label={t('discount.couponCodeLabel')}
          transform={(v) => v.toUpperCase()}
          autoCapitalize="characters"
          containerStyle={styles.input}
        />
      )}

      <Text variant="label" style={styles.sectionLabel}>{t('discount.typeLabel')}</Text>
      <View style={[styles.toggleRow, styles.toggleRowWrap]}>
        {TYPE_CHIPS.map((c) => (
          <Chip
            key={c.type}
            label={t(c.labelKey)}
            selected={type === c.type}
            variant={type === c.type ? 'primary' : 'neutral'}
            onPress={() => setType(c.type)}
          />
        ))}
      </View>

      {type === 'bogo' ? (
        <>
          <FormInput
            name="buyQuantity"
            label={t('discount.buyQuantityLabel')}
            placeholder={t('discount.buyQuantityPlaceholder')}
            transform={digitsOnly}
            keyboardType="numeric"
            containerStyle={styles.input}
          />
          <FormInput
            name="getQuantity"
            label={t('discount.getQuantityLabel')}
            placeholder={t('discount.getQuantityPlaceholder')}
            transform={digitsOnly}
            keyboardType="numeric"
            containerStyle={styles.input}
          />
        </>
      ) : (
        <>
          {type === 'bulk_quantity' ? (
            <FormInput
              name="minQuantity"
              label={t('discount.minQuantityLabel')}
              placeholder={t('discount.minQuantityPlaceholder')}
              transform={digitsOnly}
              keyboardType="numeric"
              containerStyle={styles.input}
            />
          ) : null}
          <FormInput
            name="value"
            testID="discount-value"
            label={type === 'fixed_amount' ? t('discount.valueLabelFixed') : t('discount.valueLabelPercent')}
            keyboardType="numeric"
            containerStyle={styles.input}
          />
        </>
      )}

      <Text variant="label" style={styles.sectionLabel}>{t('discount.scopeLabel')}</Text>
      <View style={styles.toggleRow}>
        <Chip
          label={t('discount.scopeAllStore')}
          selected={scope === 'seller'}
          variant={scope === 'seller' ? 'primary' : 'neutral'}
          onPress={() => setScope('seller')}
        />
        <Chip
          label={t('discount.scopeSelected')}
          selected={scope === 'product'}
          variant={scope === 'product' ? 'primary' : 'neutral'}
          onPress={() => setScope('product')}
        />
      </View>

      {scope === 'product' ? (
        <>
          <Button
            variant="outline"
            fullWidth
            title={
              targetProductIds.length > 0
                ? t('discount.productsSelectedCount', { count: targetProductIds.length })
                : t('discount.pickProducts')
            }
            onPress={openProductPicker}
            style={styles.productPickerRow}
            testID="discount-pick-products"
          />
          {errors.targetProductIds?.message ? (
            <Text variant="caption" tone="danger" style={styles.fieldError}>{errors.targetProductIds.message}</Text>
          ) : null}
        </>
      ) : null}

      <Text variant="label" style={styles.sectionLabel}>{t('discount.validityLabel')}</Text>
      <View style={styles.dateRow}>
        {(['startDate', 'endDate'] as const).map((name) => (
          <Controller
            key={name}
            control={form.control}
            name={name}
            render={({ field, fieldState }) => (
              <DateField
                testID={name === 'startDate' ? 'discount-start-date' : 'discount-end-date'}
                label={name === 'startDate' ? t('discount.startLabel') : t('discount.endLabel')}
                value={field.value}
                onChange={field.onChange}
                error={fieldState.error?.message}
                containerStyle={styles.dateInput}
              />
            )}
          />
        ))}
      </View>

      <Text variant="label" style={styles.sectionLabel}>{t('discount.limitsLabel')}</Text>
      <FormInput
        name="minCartValue"
        testID="discount-min-cart"
        label={t('discount.minCartLabel')}
        keyboardType="numeric"
        containerStyle={styles.input}
      />
      <FormInput
        name="maxDiscountAmount"
        testID="discount-max-discount"
        label={t('discount.maxDiscountLabel')}
        keyboardType="numeric"
        containerStyle={styles.input}
      />
      <FormInput
        name="usageLimitTotal"
        label={t('discount.totalUsageLimit')}
        transform={digitsOnly}
        keyboardType="numeric"
        containerStyle={styles.input}
      />
      <FormInput
        name="usageLimitPerUser"
        label={t('discount.perUserLimit')}
        transform={(v) => digitsOnly(v) || '1'}
        keyboardType="numeric"
        containerStyle={styles.input}
      />

      <View style={styles.switchRow}>
        <Text variant="bodySm">{t('discount.stackable')}</Text>
        <Switch value={isStackable} onValueChange={(v: boolean) => set('isStackable', v)} />
      </View>
      <View style={styles.switchRow}>
        <Text variant="bodySm">{t('discount.active')}</Text>
        <Switch value={isActive} onValueChange={(v: boolean) => set('isActive', v)} />
      </View>
    </>
  );
}
