import React from 'react';
import { View } from 'react-native';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ErrorState, Select, Textarea } from '@/ui';
import { Form, FormInput } from '@/ui/form';
import { useCustomItemOptions } from '../_hooks/useCustomItemOptions';
import type { AddCustomItemController } from '../_hooks/useAddCustomItem';
import type { CustomItemInput } from '../_lib/customItemSchema';
import { formStyles } from '../_lib/styles';
import { CustomItemImageField } from './CustomItemImageField';

type Option = { value: string; label: string };

/** One select bound to the form by name (web `FormSelect`). */
function SelectField({
  name,
  label,
  placeholder,
  options,
  disabled,
  onChange,
}: {
  name: keyof CustomItemInput;
  label: string;
  placeholder: string;
  options: Option[];
  disabled?: boolean;
  /** Runs after the value is set (the brand clears the model). */
  onChange?: (value: string) => void;
}) {
  const { control } = useFormContext<CustomItemInput>();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Select
          testID={`custom-item-${name}`}
          label={label}
          placeholder={placeholder}
          value={field.value || undefined}
          options={options}
          disabled={disabled}
          error={fieldState.error?.message}
          onChange={(value) => {
            field.onChange(value);
            onChange?.(value);
          }}
        />
      )}
    />
  );
}

const named = (items: ReadonlyArray<{ name: string }>): Option[] => items.map((i) => ({ value: i.name, label: i.name }));

/**
 * The custom (non-listing) item fields, same order and options as web `CustomItemForm`: title, image,
 * description, brand + model, year + scale, manufacturer + material. Brand changes clear the model;
 * the model waits for a brand; scale and material say "no options defined" when the catalog has none
 * (nothing is invented). A failed catalog read shows an inline retry; title and image still work.
 */
export function CustomItemForm({ c }: { c: AddCustomItemController }) {
  const { t } = useTranslation();
  const { form } = c;
  const brand = useWatch({ control: form.control, name: 'brand' });
  const options = useCustomItemOptions(brand || undefined);
  const { scales, materials } = options;

  return (
    <Form form={form}>
      {/* While the item is being added nothing else can be changed (web disables the whole form). */}
      <View style={formStyles.fields} pointerEvents={c.isPending ? 'none' : 'auto'}>
        <FormInput
          name="title"
          label={t('collection.customProductName')}
          placeholder={t('collection.customProductNamePlaceholder')}
          editable={!c.isPending}
        />
        <CustomItemImageField image={c.image} onPick={c.pickImage} onClear={c.clearImage} disabled={c.isPending} />
        <Controller
          name="description"
          render={({ field, fieldState }) => (
            <Textarea
              rows={2}
              label={t('product.description')}
              placeholder={t('product.descriptionPlaceholder')}
              value={field.value ?? ''}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              editable={!c.isPending}
            />
          )}
        />
        {options.filtersFailed ? (
          <ErrorState placement="inline" onRetry={options.retryFilters} testID="custom-item-options-error" />
        ) : (
          <>
            <SelectField
              name="brand"
              label={t('product.brand')}
              placeholder={t('product.selectBrand')}
              options={named(options.brands)}
              onChange={() => form.setValue('model', '')}
            />
            <SelectField
              name="model"
              label={t('product.model')}
              placeholder={
                !brand
                  ? t('product.selectBrandFirst')
                  : options.modelsLoading
                    ? t('common.loading')
                    : t('product.selectModel')
              }
              options={named(options.models)}
              disabled={!brand || options.modelsLoading}
            />
            {options.modelsFailed ? (
              <ErrorState placement="inline" onRetry={options.retryModels} testID="custom-item-models-error" />
            ) : null}
          </>
        )}
        <FormInput
          name="year"
          // Text, not a number field: the value is validated as digits only (1900..2100).
          keyboardType="number-pad"
          label={t('product.releaseYear')}
          placeholder="2026"
          editable={!c.isPending}
        />
        {options.filtersFailed ? null : (
          <>
            <SelectField
              name="scale"
              label={t('product.scale')}
              placeholder={scales.length ? t('product.selectScale') : t('product.noOptionsDefined')}
              options={scales.map((s) => ({ value: s, label: s }))}
              disabled={scales.length === 0}
            />
            <SelectField
              name="manufacturer"
              label={t('product.manufacturer')}
              placeholder={t('product.selectManufacturer')}
              options={named(options.manufacturers)}
            />
            <SelectField
              name="material"
              label={t('product.material')}
              placeholder={materials.length ? t('product.selectMaterial') : t('product.noOptionsDefined')}
              options={materials.map((m) => ({ value: m.slug, label: m.label }))}
              disabled={materials.length === 0}
            />
          </>
        )}
      </View>
    </Form>
  );
}
