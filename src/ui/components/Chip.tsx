import React from 'react';
import {
  Pressable,
  type PressableProps,
  type ViewStyle,
} from 'react-native';
import { theme } from '../lib/theme';
import { touchSlop } from './Button';
import { RawText } from './Text';
import { Icon, type IconName } from '../icons';
import { pillBoxStyle, pillTextStyle, type PillSize } from './Pill';

export type ChipVariant = 'neutral' | 'primary' | 'success' | 'danger' | 'warning' | 'info';
export type ChipSize = 'sm' | 'md';

export interface ChipProps extends Omit<PressableProps, 'style'> {
  label: string;
  /** Etiketin sonunda işlev ikonu (ör. kaldırılabilir filtre çipi için `x-mark`). */
  trailingIcon?: IconName;
  /**
   * Yalnız ETİKET modunda (seçim durumu verilmeyen, salt gösterim çipi) renk tonu.
   * Seçilebilir çipte (`selected`/`active` verildiğinde) yok sayılır: web Chip'i gibi.
   */
  variant?: ChipVariant;
  /** Web `sm` = `px-2 py-1 text-xs` (varsayılan); `md` biraz daha iri (eski mobil ölçü). */
  size?: ChipSize;
  /** Seçili durum (web `active`). Verildiğinde çip, web'in açılır-kapanır filtre çipi olur. */
  selected?: boolean;
  /** `selected` takma adı (web adı). */
  active?: boolean;
  /** Custom background color (overrides variant). Use sparingly — prefer variant. */
  backgroundColor?: string;
  textColor?: string;
  style?: ViewStyle;
}

const { colors, typography } = theme;

/** Etiket modu tonları (salt gösterim). */
const tagStyle: Record<ChipVariant, { bg: string; text: string }> = {
  neutral: { bg: colors.gray[100], text: colors.text.heading },
  primary: { bg: colors.primary[50], text: colors.primary[700] },
  success: { bg: colors.success[50], text: colors.success[700] },
  danger: { bg: colors.danger[50], text: colors.danger[700] },
  warning: { bg: colors.warning[50], text: colors.warning[800] },
  info: { bg: colors.info[50], text: colors.info[700] },
};

/**
 * Web `@tarodan/ui` Chip: `rounded-full border px-2 py-1 text-xs`. Seçili: `border-primary-200
 * bg-primary-500/10 text-primary-600`; seçili değil: `border-border text-muted`.
 */
const toggleStyle = {
  on: { bg: colors.primary[50], text: colors.primary[600], border: colors.primary[200] },
  off: { bg: 'transparent', text: colors.text.muted, border: colors.border.DEFAULT },
} as const;

/** Çip = tam yuvarlak hap (Pill tabanı): sm → Pill sm (px-2 text-xs) h24; md → Pill lg (px-3 text-sm) h32. */
const sizeMap: Record<ChipSize, { height: number; pill: PillSize }> = {
  sm: { height: 24, pill: 'sm' },
  md: { height: 32, pill: 'lg' },
};

export const Chip: React.FC<ChipProps> = ({
  label,
  trailingIcon,
  variant = 'neutral',
  size = 'sm',
  selected,
  active,
  backgroundColor,
  textColor,
  onPress,
  disabled,
  style,
  hitSlop,
  ...rest
}) => {
  const isOn = selected ?? active;
  const ss = sizeMap[size];
  const look =
    isOn === undefined
      ? { ...tagStyle[variant], border: 'transparent' }
      : isOn
        ? toggleStyle.on
        : toggleStyle.off;
  const bg = backgroundColor ?? look.bg;
  const fg = textColor ?? look.text;

  return (
    <Pressable
      disabled={disabled || !onPress}
      onPress={onPress}
      hitSlop={hitSlop ?? (onPress ? touchSlop(ss.height) : undefined)}
      style={({ pressed }) => [
        pillBoxStyle(ss.pill, 'full'),
        trailingIcon ? { gap: theme.spacing[1] } : null,
        {
          height: ss.height,
          paddingVertical: 0,
          borderWidth: 1,
          backgroundColor: bg,
          borderColor: look.border,
          opacity: disabled ? 0.5 : pressed && onPress ? 0.85 : 1,
        },
        style,
      ]}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={isOn === undefined ? undefined : { selected: isOn }}
      {...rest}
    >
      <RawText style={pillTextStyle(ss.pill, fg, typography.fontWeight.regular)} numberOfLines={1}>
        {label}
      </RawText>
      {trailingIcon ? <Icon name={trailingIcon} size={theme.iconSize.sm} color={fg} /> : null}
    </Pressable>
  );
};

