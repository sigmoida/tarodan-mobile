import React, { useState } from 'react';
import {
  FlatList,
  Modal as RNModal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme } from '../lib/theme';
import { RawText } from './Text';
import { FieldMessage, Label } from './Label';
import { fieldBorderColor, inputSizeStyle } from './Input';

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
}

const { colors, radius, spacing, typography, iconSize } = theme;

/** Web Select tetikleyicisi = Input ile aynı ölçü/çerçeve (`selectTriggerClasses`). */
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
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
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
        <Ionicons name="chevron-down" size={iconSize.sm} color={colors.text.subtle} />
      </Pressable>
      <FieldMessage error={error} helperText={helperText} />

      <RNModal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet}>
            <FlatList
              data={options}
              keyExtractor={(o) => o.value}
              renderItem={({ item }) => (
                <Pressable
                  disabled={item.disabled}
                  onPress={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: item.value === value, disabled: !!item.disabled }}
                  style={({ pressed }) => [
                    styles.option,
                    pressed && styles.optionPressed,
                    item.disabled ? styles.optionDisabled : null,
                  ]}
                >
                  <RawText
                    style={[
                      styles.optionText,
                      item.value === value && styles.optionTextSelected,
                    ]}
                  >
                    {item.label}
                  </RawText>
                  {item.value === value ? (
                    <Ionicons name="checkmark" size={iconSize.sm} color={colors.primary[600]} />
                  ) : null}
                </Pressable>
              )}
            />
          </Pressable>
        </Pressable>
      </RNModal>
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
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay.black50,
    justifyContent: 'flex-end',
  },
  // Platform kalıbı: web'in açılır menüsü yerine alttan panel (modal radius'u).
  sheet: {
    backgroundColor: colors.surface.elevated,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '60%',
    paddingVertical: spacing[2],
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
    minHeight: theme.minTouchTarget,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
  },
  optionPressed: {
    backgroundColor: colors.surface.alt,
  },
  optionDisabled: {
    opacity: 0.5,
  },
  optionText: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: colors.text.body,
  },
  optionTextSelected: {
    fontWeight: typography.fontWeight.medium,
  },
});
