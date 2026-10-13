import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Input, SectionCard } from '@/ui';
import { useStableCallback } from '@/hooks/useStableCallback';

import { buildConditions } from '../_lib/constants';
import { MAX_COLORS } from '../_lib/schema';
import type { ListingFormController } from '../_hooks/useListingForm';
import { ChoiceChips, ColorChips, FieldGroup, PickerField, fieldStyles, type ChoiceOption } from './fields';

type SectionProps = { f: ListingFormController };

const BOXED_VALUES = ['boxed', 'unboxed'] as const;
type BoxedValue = (typeof BOXED_VALUES)[number];

/**
 * Ürün detayları (web `ProductDetailsCard`): kategori, durum, marka, model, ölçek, malzeme,
 * üretici, renk, kutu, model kodu, yıl. Seçici satırları `ListingPickers` modallarını açar.
 */
export function ListingDetailsSection({ f }: SectionProps) {
  const { t } = useTranslation();
  const conditions = useMemo(() => buildConditions(t), [t]);
  const scaleOptions = useMemo<ChoiceOption[]>(
    () => f.effectiveScales.map((s) => ({ value: s, label: s })),
    [f.effectiveScales],
  );
  const boxedOptions = useMemo<ChoiceOption[]>(
    () =>
      BOXED_VALUES.map((value) => ({
        value,
        label: t(value === 'boxed' ? 'product.boxed' : 'product.unboxed'),
        testID: `listing-${value}`,
      })),
    [t],
  );

  const openCategory = useStableCallback(() => {
    f.setCategorySearch('');
    f.setShowCategoryPicker(true);
  });
  const openBrand = useStableCallback(() => {
    f.setBrandSearch('');
    f.setShowBrandPicker(true);
  });
  const openModel = useStableCallback(() => f.setShowModelPicker(true));
  const openMaterial = useStableCallback(() => f.setShowMaterialPicker(true));
  const openManufacturer = useStableCallback(() => {
    f.setManufacturerSearch('');
    f.setShowManufacturerPicker(true);
  });
  const openYear = useStableCallback(() => f.setShowYearPicker(true));
  const onCondition = useStableCallback(f.setCondition);
  const onScale = useStableCallback(f.setScale);
  const onColor = useStableCallback(f.toggleColor);
  const onBoxed = useStableCallback((v: string) => f.setIsBoxed(v as BoxedValue));

  // Model: önce marka, sonra yükleniyor / markada model yok / seçili / seçin.
  const modelReady = !!f.brandId && !f.modelsLoading && f.models.length > 0;
  const modelPlaceholder = !f.brandId
    ? t('product.selectBrandFirst')
    : f.modelsLoading
      ? t('common.loading')
      : f.models.length === 0
        ? t('product.noModelsForBrand')
        : t('product.selectModel');

  return (
    <SectionCard title={t('product.productDetails')} bodyStyle={fieldStyles.body}>
      <PickerField
        label={t('product.category')}
        required
        value={f.selectedCategory?.name}
        placeholder={t('product.selectCategory')}
        onPress={openCategory}
      />

      <FieldGroup label={t('product.condition')} required>
        <ChoiceChips options={conditions} selected={f.condition} onSelect={onCondition} />
      </FieldGroup>

      <PickerField
        label={t('product.brand')}
        required
        value={f.brandsLoading ? null : f.selectedBrand?.name}
        placeholder={f.brandsLoading ? t('common.loading') : t('product.selectBrand')}
        onPress={openBrand}
        disabled={f.brandsLoading}
      />

      <PickerField
        label={t('product.model')}
        value={modelReady ? f.selectedModel?.name : null}
        placeholder={modelPlaceholder}
        onPress={openModel}
        disabled={!f.brandId || f.modelsLoading}
      />

      <FieldGroup label={t('product.scale')} required>
        <ChoiceChips options={scaleOptions} selected={f.scale} onSelect={onScale} />
      </FieldGroup>

      <PickerField
        label={t('product.material')}
        required
        value={f.selectedMaterial?.label}
        placeholder={t('product.selectMaterial')}
        onPress={openMaterial}
      />

      <PickerField
        label={t('product.manufacturer')}
        required
        value={f.selectedManufacturer?.name}
        placeholder={t('product.selectManufacturer')}
        onPress={openManufacturer}
      />

      {/* Renk ve kutu durumu sunucuda zorunlu (2026-07-29, `0096579da`) — web ile
          aynı: katalog renkleri çoklu seçim (`colors`), kutu durumu boolean. */}
      <FieldGroup
        label={t('product.color')}
        required
        hint={t('listing.colorLimitHint', { max: MAX_COLORS })}
      >
        <ColorChips options={f.colorList} selected={f.colors} onToggle={onColor} />
      </FieldGroup>

      <FieldGroup label={t('product.boxedCondition')} required>
        <ChoiceChips options={boxedOptions} selected={f.isBoxed} onSelect={onBoxed} />
      </FieldGroup>

      <Input
        label={t('product.modelCodeLabel')}
        value={f.modelCode}
        onChangeText={f.setModelCode}
        placeholder={t('product.modelCodePlaceholder')}
        maxLength={100}
        style={fieldStyles.flush}
      />

      <PickerField
        label={t('product.releaseYear')}
        value={f.year || null}
        placeholder={t('product.selectYear')}
        onPress={openYear}
      />
    </SectionCard>
  );
}
