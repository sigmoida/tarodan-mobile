import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../lib/theme';
import { RawText } from './Text';
import { FieldMessage, Label } from './Label';
import { fieldBorderColor, inputSizeStyle } from './Input';
import { SelectSheet } from './SelectSheet';

import { Icon } from '../icons';
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
  selectSize?: 'sm' | 'md' | 'lg';
  /** Etiketin sonuna kırmızı `*`. */
  required?: boolean;
  /** Seçenek sheet'inde arama kutusu (uzun listeler). */
  searchable?: boolean;
  /** Tetikleyiciye; sheet `${testID}-sheet`. */
  testID?: string;
}

const { colors, radius, spacing, iconSize } = theme;

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
  const ss = inputSizeStyle[selectSize];

  return (
    <View style={styles.container}>
      {label ? <Label required={required}>{label}</Label> : null}
      <Pressable
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={[
          styles.field,
          {
            height: ss.height,
            paddingHorizontal: ss.px,
            borderColor: fieldBorderColor(error, open),
            backgroundColor: disabled ? colors.surface.DEFAULT : colors.surface.elevated,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
        accessibilityRole="combobox"
        accessibilityState={{ expanded: open, disabled: !!disabled }}
        testID={testID}
      >
        <RawText
          numberOfLines={1}
          style={[
            styles.value,
            { fontSize: ss.font, color: selected ? colors.text.body : colors.text.subtle },
          ]}
        >
          {selected ? selected.label : resolvedPlaceholder}
        </RawText>
        <Icon name="chevron-down" size={iconSize.sm} color={colors.text.subtle} />
      </Pressable>
      <FieldMessage error={error} helperText={helperText} />

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
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: '100%', marginBottom: spacing[2] },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
    borderWidth: 1,
    borderRadius: radius.lg,
  },
  value: { flex: 1 },
});
