import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, ScrollView } from 'react-native';
import { Modal, ModalFooter, Button, Switch, Chip, Text, ModalMessage, useModalMessage } from '@/ui';
import { useZodForm, Form, FormInput } from '@/ui/form';
import type { MessageKey } from '@/i18n/lib';

import { styles } from '../_lib/styles';
import { buildDiscountPayload } from '../_lib/form';
import {
  discountDefaultValues,
  discountSchema,
  discountToFormValues,
  type DiscountFormValues,
} from '../_lib/schema';
import { isQuantityType, type Discount, type DiscountType } from '../_lib/types';
import { useSaveDiscount } from '../_hooks/useSaveDiscount';
import { ProductPickerModal } from './ProductPickerModal';

const TYPE_CHIPS: Array<{ type: DiscountType; labelKey: MessageKey }> = [
  { type: 'percentage', labelKey: 'discount.typePercent' },
  { type: 'fixed_amount', labelKey: 'discount.typeFixed' },
  { type: 'bogo', labelKey: 'discount.typeBogo' },
  { type: 'bulk_quantity', labelKey: 'discount.typeBulk' },
];

const digitsOnly = (v: string) => v.replace(/[^0-9]/g, '');
const decimal = (v: string) => v.replace(',', '.');

/**
 * Oluştur/düzenle indirim formu. Kendi `useZodForm` + şema + kaydetme
 * mutasyonunu taşır; ekran yalnız açar/kapatır. Hata modal İÇİNDE gösterilir
 * (appAlert açık Modal'da iOS'u dondurur); alan hataları ilgili girdinin altında.
 */
export function DiscountFormModal({
  visible,
  discount,
  onClose,
  onSaved,
}: {
  visible: boolean;
  /** Düzenlenen indirim; `null` = yeni. */
  discount: Discount | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const { t } = useTranslation();
  const schema = useMemo(() => discountSchema(t), [t]);
  const form = useZodForm(schema, { defaultValues: discountDefaultValues() });
  const formMsg = useModalMessage();
  const [pickerOpen, setPickerOpen] = useState(false);

  // Her açılışta kayıttan (ya da boş) başla.
  useEffect(() => {
    if (!visible) return;
    form.reset(discount ? discountToFormValues(discount) : discountDefaultValues());
    formMsg.clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, discount?.id]);

  const save = useSaveDiscount({
    onSaved: (updated) => {
      onSaved(t(updated ? 'discount.updated' : 'discount.created'));
      onClose();
    },
    onFailed: (e) => {
      const msg = e?.response?.data?.message;
      formMsg.error(Array.isArray(msg) ? msg.join('\n') : msg || t('discount.saveFailed'));
    },
  });

  const [type, scope, targetProductIds, isStackable, isActive] = form.watch([
    'type',
    'scope',
    'targetProductIds',
    'isStackable',
    'isActive',
  ]);
  const errors = form.formState.errors;

  const set = <K extends keyof DiscountFormValues>(key: K, value: DiscountFormValues[K]) =>
    form.setValue(key, value as never, { shouldDirty: true });
  // Tür değişince eski türün (alan bazlı) hataları geçersiz kalır.
  const setType = (next: DiscountType) => {
    set('type', next);
    form.clearErrors();
  };

  const onSubmit = form.handleSubmit((values) => {
    formMsg.clear();
    if (discount) save.mutate({ id: discount.id, payload: buildDiscountPayload(values, true) });
    else save.mutate({ payload: buildDiscountPayload(values) });
  });

  return (
    <>
    <Modal
      isOpen={visible}
      onClose={onClose}
      title={discount ? t('discount.editTitle') : t('discount.newTitle')}
      scrollable={false}
      footer={
        <ModalFooter
          onCancel={onClose}
          onConfirm={onSubmit}
          cancelLabel={t('discount.discard')}
          confirmLabel={discount ? t('discount.update') : t('discount.create')}
          disabled={save.isPending}
        />
      }
    >
      <Form form={form}>
        <ScrollView style={styles.dialogScroll} keyboardShouldPersistTaps="handled">
          <View style={styles.formBody}>
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
                  label={type === 'fixed_amount' ? t('discount.valueLabelFixed') : t('discount.valueLabelPercent')}
                  transform={decimal}
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
                onPress={() => {
                  set('scope', 'seller');
                  set('targetProductIds', []);
                  form.clearErrors('targetProductIds');
                }}
              />
              <Chip
                label={t('discount.scopeSelected')}
                selected={scope === 'product'}
                variant={scope === 'product' ? 'primary' : 'neutral'}
                onPress={() => set('scope', 'product')}
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
                  onPress={() => setPickerOpen(true)}
                  style={styles.productPickerRow}
                />
                {errors.targetProductIds?.message ? (
                  <Text variant="caption" tone="danger" style={styles.fieldError}>{errors.targetProductIds.message}</Text>
                ) : null}
              </>
            ) : null}

            <Text variant="label" style={styles.sectionLabel}>{t('discount.validityLabel')}</Text>
            <View style={styles.dateRow}>
              <FormInput
                name="startDate"
                label={t('discount.startLabel')}
                placeholder="2026-04-22"
                containerStyle={styles.dateInput}
              />
              <FormInput
                name="endDate"
                label={t('discount.endLabel')}
                placeholder="2026-05-22"
                containerStyle={styles.dateInput}
              />
            </View>

            <Text variant="label" style={styles.sectionLabel}>{t('discount.limitsLabel')}</Text>
            <FormInput
              name="minCartValue"
              label={t('discount.minCartLabel')}
              transform={decimal}
              keyboardType="numeric"
              containerStyle={styles.input}
            />
            <FormInput
              name="maxDiscountAmount"
              label={t('discount.maxDiscountLabel')}
              transform={decimal}
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
          </View>
        </ScrollView>
      </Form>

      <ModalMessage state={formMsg.state} />
    </Modal>
    <ProductPickerModal
      visible={pickerOpen}
      selectedIds={targetProductIds}
      onChange={(ids) => {
        set('targetProductIds', ids);
        if (ids.length > 0) form.clearErrors('targetProductIds');
      }}
      onClose={() => setPickerOpen(false)}
    />
    </>
  );
}
