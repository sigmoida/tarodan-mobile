import React, { memo, useCallback } from 'react';
import { View } from 'react-native';
import { useController, type Control } from 'react-hook-form';
import { Input, Textarea, type TextareaProps } from '@/ui';

import type { ListingFormValues } from '../_lib/schema';
import { CharCount } from './fields';

/** Değeri yalnız alanın kendisinde okunan (controller'ın izlemediği) serbest metin alanları. */
export type ListingTextFieldName = 'title' | 'description' | 'modelCode' | 'bundleSize';

export interface FormTextFieldProps extends Omit<TextareaProps, 'value' | 'onChangeText' | 'rows'> {
  control: Control<ListingFormValues>;
  name: ListingTextFieldName;
  /** Verilirse çok satırlı (`Textarea`) çizilir. */
  rows?: number;
  /** Verilirse alanın altında "n/max" sayacı (alanla tek blok). */
  countMax?: number;
  /** Her tuş vuruşunu forma yazmadan önce normalize eder (ör. yalnız rakam). */
  transform?: (text: string) => string;
}

/**
 * RHF'ye `useController` ile bağlı metin alanı. Tuş vuruşu YALNIZ bu bileşeni yeniden çizer —
 * ilan formu controller'ı (`useListingForm`) bu alanları izlemez, değerleri gönderimde
 * `getValues()` ile okur. `form.reset` (düzenleme ön dolumu, 409) alanı kendiliğinden günceller.
 */
export const FormTextField = memo(function FormTextField({
  control,
  name,
  rows,
  countMax,
  transform,
  ...inputProps
}: FormTextFieldProps) {
  const { field } = useController({ control, name });
  const value = typeof field.value === 'string' ? field.value : '';
  const { onChange } = field;
  const onChangeText = useCallback(
    (text: string) => onChange(transform ? transform(text) : text),
    [onChange, transform],
  );
  const input =
    rows !== undefined ? (
      <Textarea {...inputProps} rows={rows} value={value} onChangeText={onChangeText} />
    ) : (
      <Input {...inputProps} value={value} onChangeText={onChangeText} />
    );
  if (countMax === undefined) return input;
  return (
    <View>
      {input}
      <CharCount value={value} max={countMax} />
    </View>
  );
});
