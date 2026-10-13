import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { theme } from '../lib/theme';
import { RawText } from './Text';

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  error?: string;
  testID?: string;
}

const { colors, radius, spacing, typography } = theme;

const sizeMap = { sm: 16, md: 20, lg: 24 } as const;

export interface CheckboxIndicatorProps {
  checked: boolean;
  /** pt (varsayılan 20 = `md`) ya da boyut adı. */
  size?: number | keyof typeof sizeMap;
  /** Hata çerçevesi (danger-600). */
  error?: boolean;
}

/**
 * Web checkbox kutusu — TEK yer: seçili = primary-600 dolu kutu + beyaz ✓, seçili değil = beyaz
 * kutu + gray-300 çerçeve. `Checkbox` ve kendi satırını çizen listeler (`SelectSheet`) kullanır;
 * dokunma satırdadır, kutu yalnız görseldir.
 */
export const CheckboxIndicator: React.FC<CheckboxIndicatorProps> = ({ checked, size = 'md', error }) => {
  const s = typeof size === 'number' ? size : sizeMap[size];
  return (
    <View
      style={[
        styles.box,
        {
          width: s,
          height: s,
          borderRadius: radius.sm,
          backgroundColor: checked ? colors.primary[600]! : colors.white,
          borderColor: error
            ? colors.danger[600]!
            : checked
              ? colors.primary[600]!
              : colors.gray[300],
        },
      ]}
    >
      {checked && <RawText style={[styles.check, { fontSize: s * 0.7 }]}>✓</RawText>}
    </View>
  );
};

export const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onChange,
  label,
  disabled,
  size = 'md',
  error,
  testID,
}) => {
  return (
    <Pressable
      testID={testID}
      disabled={disabled}
      onPress={() => onChange(!checked)}
      style={[styles.row, disabled ? styles.disabled : null]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
    >
      <CheckboxIndicator checked={checked} size={size} error={!!error} />
      {label && (
        <RawText style={[styles.label, disabled ? styles.labelDisabled : null]}>
          {label}
        </RawText>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  disabled: { opacity: 0.5 },
  box: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    color: colors.white,
    fontWeight: '700',
    lineHeight: undefined,
  },
  label: {
    fontSize: typography.fontSize.sm,
    color: colors.text.body,
    flex: 1,
  },
  labelDisabled: { color: colors.text.muted },
});
