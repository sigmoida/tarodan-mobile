import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FieldTrigger } from './FieldTrigger';
import type { FieldSize } from '../lib/fieldSurface';
import { SelectSheet } from './SelectSheet';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  value?: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  label?: string;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  selectSize?: FieldSize;
  /** Etiketin sonuna kırmızı `*`. */
  required?: boolean;
  /** Seçenek sheet'inde arama kutusu (uzun listeler). */
  searchable?: boolean;
  /** Tetikleyiciye; sheet `${testID}-sheet`. */
  testID?: string;
}

/**
 * Web Select tetikleyicisi = Input ile aynı ölçü/çerçeve (`selectTriggerClasses`). Seçenekler
 * platform kalıbıyla alttan açılan `SelectSheet`'te (tek seçim; seçince kapanır).
 *
 * Not: bir `Modal` İÇİNDE kullanılırsa sheet ikinci bir native Modal olarak üstte açılır
 * (iç içe sunum) — yeni kullanımda Modal içinde Select yerine satır içi RadioGroup tercih edin.
 */
export const Select: React.FC<SelectProps> = ({
  value,
  onChange,
  options,
  placeholder,
  label,
  error,
  helperText,
  disabled,
  selectSize = 'md',
  required,
  searchable,
  testID,
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const selected = options.find((o) => o.value === value);
  const resolvedPlaceholder = placeholder ?? t('common.selectPlaceholder');

  return (
    <>
      <FieldTrigger
        label={label}
        required={required}
        value={selected?.label}
        placeholder={resolvedPlaceholder}
        onPress={() => setOpen(true)}
        disabled={disabled}
        error={error}
        helperText={helperText}
        open={open}
        size={selectSize}
        accessibilityRole="combobox"
        testID={testID}
      />

      <SelectSheet
        isOpen={open}
        onClose={close}
        title={label ?? resolvedPlaceholder}
        options={options}
        value={value}
        onSelect={onChange}
        searchable={searchable}
        testID={testID ? `${testID}-sheet` : 'select-sheet'}
      />
    </>
  );
};
