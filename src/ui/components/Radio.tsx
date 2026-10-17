import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { theme } from '../lib/theme';
import { RawText } from './Text';

export interface RadioProps {
  checked: boolean;
  onChange: () => void;
  label?: React.ReactNode;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const { colors, spacing, typography } = theme;

const sizeMap = { sm: 16, md: 20, lg: 24 } as const;

export interface RadioIndicatorProps {
  checked: boolean;
  /** pt (varsayılan 20 = `md`) ya da boyut adı. */
  size?: number | keyof typeof sizeMap;
  /** Seçili halka + nokta rengi (varsayılan primary-600). */
  color?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Web radio görünümü — TEK yer: seçili = tint halka + dolu nokta, seçili değil = boş border'lı
 * halka (gray-300), tam yuvarlak. `Radio` ve radyo gibi davranan satırlar (kart/adres/neden seçimi)
 * bunu kullanır; seçili-değil için "eksi" ikonu kullanılmaz.
 */
export const RadioIndicator: React.FC<RadioIndicatorProps> = ({
  checked,
  size = 'md',
  color = colors.primary[600]!,
  style,
}) => {
  const s = typeof size === 'number' ? size : sizeMap[size];
  return (
    <View
      style={[
        styles.outer,
        { width: s, height: s, borderRadius: s / 2, borderColor: checked ? color : colors.gray[300] },
        style,
      ]}
    >
      {checked && (
        <View
          style={[
            styles.inner,
            { width: s * 0.55, height: s * 0.55, borderRadius: (s * 0.55) / 2, backgroundColor: color },
          ]}
        />
      )}
    </View>
  );
};

export const Radio: React.FC<RadioProps> = ({
  checked,
  onChange,
  label,
  disabled,
  size = 'md',
}) => {
  const s = sizeMap[size];
  return (
    <Pressable
      disabled={disabled}
      onPress={onChange}
      style={[styles.row, disabled ? styles.disabled : null]}
      accessibilityRole="radio"
      accessibilityState={{ checked, disabled }}
    >
      <RadioIndicator checked={checked} size={s} />
      {label && <RawText style={styles.label}>{label}</RawText>}
    </Pressable>
  );
};

export interface RadioGroupOption {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
}

export interface RadioGroupProps {
  value?: string;
  onChange: (value: string) => void;
  options: RadioGroupOption[];
  orientation?: 'vertical' | 'horizontal';
  size?: 'sm' | 'md' | 'lg';
}

export const RadioGroup: React.FC<RadioGroupProps> = ({
  value,
  onChange,
  options,
  orientation = 'vertical',
  size = 'md',
}) => {
  return (
    <View
      style={{
        flexDirection: orientation === 'vertical' ? 'column' : 'row',
        flexWrap: orientation === 'horizontal' ? 'wrap' : 'nowrap',
        gap: spacing[3],
      }}
    >
      {options.map((opt) => (
        <Radio
          key={opt.value}
          checked={value === opt.value}
          onChange={() => onChange(opt.value)}
          label={opt.label}
          disabled={opt.disabled}
          size={size}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  disabled: { opacity: 0.5 },
  outer: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {},
  label: {
    fontSize: typography.fontSize.sm,
    color: colors.text.body,
    flex: 1,
  },
});
