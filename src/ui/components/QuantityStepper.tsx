import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../lib/theme';
import { RawText } from './Text';

import { Icon } from '../icons';
/**
 * Adet seçici (− [n] +) — web `@tarodan/ui` QuantityStepper. Stok duyarlı: `max`'ta `+`,
 * `min`'de (varsayılan 1) `−` kilitlenir. `onChange` yalnız sınır içi değerle çağrılır.
 */
export interface QuantityStepperProps {
  value: number;
  onChange: (next: number) => void;
  /** Alt sınır (varsayılan 1). */
  min?: number;
  /** Üst sınır (stok ∧ sipariş sınırı). Yoksa üst sınır yok. */
  max?: number;
  disabled?: boolean;
  size?: 'xs' | 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
  decreaseLabel?: string;
  increaseLabel?: string;
}

const { colors, spacing, radius, radiusRole, typography, iconSize, minTouchTarget } = theme;

/** Web: sm h-8 min-w-8 text-sm · md h-10 min-w-10 text-base. `xs` = satır içi sıkı (h-7, text-xs; sepet). */
const boxSize = { xs: spacing[6] + spacing[1], sm: 32, md: 40 } as const;
const valueFont = { xs: typography.fontSize.xs, sm: typography.fontSize.sm, md: typography.fontSize.base } as const;

export const QuantityStepper: React.FC<QuantityStepperProps> = ({
  value,
  onChange,
  min = 1,
  max,
  disabled = false,
  size = 'md',
  style,
  decreaseLabel,
  increaseLabel,
}) => {
  const { t } = useTranslation();
  const atMin = value <= min;
  const atMax = max != null && value >= max;
  const box = boxSize[size];
  const slop = Math.max(0, Math.ceil((minTouchTarget - box) / 2));

  const step = (delta: number) => {
    if (disabled) return;
    const next = value + delta;
    if (next < min) return;
    if (max != null && next > max) return;
    onChange(next);
  };

  const renderButton = (
    kind: 'dec' | 'inc',
    isDisabled: boolean,
    label: string,
  ) => (
    <Pressable
      onPress={() => step(kind === 'dec' ? -1 : 1)}
      disabled={isDisabled}
      hitSlop={slop}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled }}
      style={({ pressed }) => [
        styles.btn,
        { height: box, minWidth: box },
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
      ]}
    >
      <Icon name={kind === 'dec' ? 'minus' : 'plus'} size={iconSize.sm} color={colors.text.body} />
    </Pressable>
  );

  return (
    <View style={[styles.container, style]}>
      {renderButton('dec', disabled || atMin, decreaseLabel ?? t('cart.decreaseQuantity'))}
      <View style={[styles.valueBox, { height: box, minWidth: box }]} accessibilityLiveRegion="polite">
        <RawText style={[styles.value, { fontSize: valueFont[size] }]}>{value}</RawText>
      </View>
      {renderButton('inc', disabled || atMax, increaseLabel ?? t('cart.increaseQuantity'))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing[1],
    borderRadius: radiusRole.input,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    backgroundColor: colors.surface.DEFAULT,
    padding: spacing[1],
  },
  btn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  pressed: { backgroundColor: colors.surface.alt },
  disabled: { opacity: 0.4 },
  valueBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[2],
  },
  value: {
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.heading,
    fontVariant: ['tabular-nums'],
  },
});
