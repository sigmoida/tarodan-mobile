import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type Insets,
  type PressableProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { theme } from '../lib/theme';
import { RawText } from './Text';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

/** Web `@tarodan/ui` Button varyantları (adlar aynı). */
export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger'
  | 'success'
  | 'warning'
  | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

export interface ButtonProps extends Omit<PressableProps, 'style'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Web gibi: düğme kilitlenir, etiketin önünde dönen gösterge çıkar. */
  isLoading?: boolean;
  /** Pass a custom node (e.g. an SVG). Takes precedence over `icon`. */
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  /** Convenience: render an Ionicon by name. Position controlled by `iconPosition`. */
  icon?: IoniconName;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  children?: React.ReactNode;
  /** Button label. Alias for children; useful when passing icons via slots. */
  title?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const { colors, radiusRole, spacing, typography, controlHeight, iconSize, minTouchTarget } =
  theme;

/** Web: `bg-* text-*` (+ outline için `border-border`). `text` = etiket/ikon rengi. */
const variantStyle: Record<ButtonVariant, { bg: string; text: string; border?: string }> = {
  primary: { bg: colors.primary[600], text: colors.text.inverted },
  secondary: { bg: colors.surface.alt, text: colors.text.heading },
  outline: { bg: 'transparent', text: colors.text.body, border: colors.border.DEFAULT },
  ghost: { bg: 'transparent', text: colors.text.body },
  danger: { bg: colors.danger[600], text: colors.text.inverted },
  success: { bg: colors.success[600], text: colors.text.inverted },
  warning: { bg: colors.warning[500], text: colors.text.inverted },
  link: { bg: 'transparent', text: colors.primary[600] },
};

/** Web: sm h-8 px-3 text-sm · md h-10 px-4 text-sm · lg h-12 px-6 text-base · xl h-14 px-8 text-lg. */
const sizeStyle: Record<ButtonSize, { height: number; px: number; font: number; icon: number }> = {
  sm: { height: controlHeight.sm, px: spacing[3], font: typography.fontSize.sm, icon: iconSize.sm },
  md: { height: controlHeight.md, px: spacing[4], font: typography.fontSize.sm, icon: iconSize.sm },
  lg: { height: controlHeight.lg, px: spacing[6], font: typography.fontSize.base, icon: iconSize.md },
  xl: { height: controlHeight.xl, px: spacing[8], font: typography.fontSize.lg, icon: iconSize.md },
};

/** Görsel yükseklik 44'ün altındaysa dokunma alanını dikeyde `hitSlop` ile 44'e tamamlar. */
export function touchSlop(visualHeight: number): Insets | undefined {
  const pad = Math.ceil((minTouchTarget - visualHeight) / 2);
  return pad > 0 ? { top: pad, bottom: pad } : undefined;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading,
  disabled,
  leftIcon,
  rightIcon,
  icon,
  iconPosition = 'left',
  children,
  title,
  style,
  textStyle,
  fullWidth,
  hitSlop,
  ...rest
}) => {
  const vs = variantStyle[variant];
  const ss = sizeStyle[size];
  const isLink = variant === 'link';
  const label = title ?? children;
  const ionIconNode = icon ? <Ionicons name={icon} size={ss.icon} color={vs.text} /> : null;
  const resolvedLeftIcon = leftIcon ?? (iconPosition === 'left' ? ionIconNode : null);
  const resolvedRightIcon = rightIcon ?? (iconPosition === 'right' ? ionIconNode : null);
  const visualHeight = isLink ? ss.font * 1.5 : ss.height;

  return (
    <Pressable
      disabled={disabled || isLoading}
      hitSlop={hitSlop ?? touchSlop(visualHeight)}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: vs.bg,
          borderColor: vs.border ?? 'transparent',
          borderWidth: vs.border ? 1 : 0,
          opacity: disabled || isLoading ? 0.5 : pressed ? 0.85 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        isLink ? styles.link : { height: ss.height, paddingHorizontal: ss.px },
        style,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!(disabled || isLoading), busy: !!isLoading }}
      {...rest}
    >
      <View style={styles.row}>
        {isLoading ? (
          <ActivityIndicator size="small" color={vs.text} style={styles.iconLeft} />
        ) : (
          resolvedLeftIcon && <View style={styles.iconLeft}>{resolvedLeftIcon}</View>
        )}
        {typeof label === 'string' ? (
          <RawText
            style={[
              styles.text,
              { color: vs.text, fontSize: ss.font, fontWeight: typography.fontWeight.medium },
              textStyle,
            ]}
          >
            {label}
          </RawText>
        ) : (
          label
        )}
        {resolvedRightIcon && <View style={styles.iconRight}>{resolvedRightIcon}</View>}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radiusRole.button,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  link: {
    paddingHorizontal: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    textAlign: 'center',
  },
  iconLeft: { marginRight: spacing[2] },
  iconRight: { marginLeft: spacing[2] },
});
