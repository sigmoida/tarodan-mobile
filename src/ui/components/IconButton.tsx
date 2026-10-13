import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type PressableProps,
  type ViewStyle,
} from 'react-native';
import { theme } from '../lib/theme';
import { RefIcon, type IconRef, type IconVariant } from '../icons';
import { androidRipple, rippleClip, showPressedStyle } from '../lib/pressableFeedback';

/**
 * Web `@tarodan/ui` IconButton varyantları: primary, secondary, outline, ghost (varsayılan),
 * danger, success. Eski mobil adlar takma ad olarak çalışmaya devam eder:
 * `plain` → ghost, `solid` → primary, `soft` → marka tonu (primary-50/700; web'de karşılığı yok).
 */
export type IconButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger'
  | 'success'
  | 'plain'
  | 'soft'
  | 'solid';
export type IconButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export interface IconButtonProps extends Omit<PressableProps, 'style'> {
  /** Heroicons adı (web ile aynı). Geçiş: eski Ionicons adları da çözülür. */
  icon: IconRef;
  /** `outline` (varsayılan) ya da dolu durum için `solid`. */
  iconVariant?: IconVariant;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  /** Override icon color (otherwise derived from variant). */
  color?: string;
  isLoading?: boolean;
  style?: ViewStyle;
  /** Required for screen reader. */
  accessibilityLabel: string;
}

const { colors, radiusRole, iconSize, minTouchTarget } = theme;

/** Web: xs h-6 · sm h-8 · md h-10 · lg h-12. İkon 16/20/20/24 (heroicons h-4/h-5/h-6). */
const sizeMap: Record<IconButtonSize, { box: number; icon: number }> = {
  xs: { box: 24, icon: iconSize.sm },
  sm: { box: 32, icon: iconSize.md },
  md: { box: 40, icon: iconSize.md },
  lg: { box: 48, icon: iconSize.lg },
};

/** Düğmenin kenar uzunluğu (pt) — bunu kullanan yerleşim hesapları ölçüyü buradan türetir. */
export const iconButtonBoxSize = (size: IconButtonSize): number => sizeMap[size].box;

const variantStyle: Record<IconButtonVariant, { bg: string; fg: string; border?: string }> = {
  primary: { bg: colors.primary[600], fg: colors.text.inverted },
  secondary: { bg: colors.surface.alt, fg: colors.text.heading },
  outline: { bg: 'transparent', fg: colors.text.body, border: colors.border.DEFAULT },
  ghost: { bg: 'transparent', fg: colors.text.muted },
  danger: { bg: 'transparent', fg: colors.danger[600] },
  success: { bg: 'transparent', fg: colors.success[600] },
  // Takma adlar (eski mobil API).
  plain: { bg: 'transparent', fg: colors.text.muted },
  solid: { bg: colors.primary[600], fg: colors.text.inverted },
  soft: { bg: colors.primary[50], fg: colors.primary[700] },
};

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  iconVariant,
  variant = 'ghost',
  size = 'md',
  color,
  isLoading,
  disabled,
  style,
  accessibilityLabel,
  hitSlop,
  ...rest
}) => {
  const ss = sizeMap[size];
  const vs = variantStyle[variant];
  const fg = color ?? vs.fg;
  // Görsel ölçü web gibi kalır; dokunma alanı en az 44pt (eski davranış: her yönde ≥ 8).
  const slop = Math.max(8, Math.ceil((minTouchTarget - ss.box) / 2));
  // Android dalgası: zeminsiz + çerçevesiz (ghost/plain/danger/success) → sınırsız daire, dokunma
  // alanı kadar (HeaderIconButton gibi); zeminli/çerçeveli → kutuya sınırlı, köşeye kırpılmış.
  const bare = vs.bg === 'transparent' && !vs.border;
  const ripple = bare
    ? androidRipple({ borderless: true, radius: Math.max(ss.box, minTouchTarget) / 2 })
    : androidRipple({ tone: vs.fg === colors.text.inverted ? 'onDark' : 'onLight' });
  return (
    <Pressable
      disabled={disabled || isLoading}
      hitSlop={hitSlop ?? slop}
      android_ripple={ripple}
      style={({ pressed }) => [
        styles.base,
        bare ? null : rippleClip(),
        {
          width: ss.box,
          height: ss.box,
          backgroundColor: vs.bg,
          borderColor: vs.border ?? 'transparent',
          borderWidth: vs.border ? 1 : 0,
          opacity: disabled || isLoading ? 0.5 : showPressedStyle(pressed) ? 0.7 : 1,
        },
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!(disabled || isLoading), busy: !!isLoading }}
      {...rest}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        <RefIcon icon={icon} variant={iconVariant} size={ss.icon} color={fg} />
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radiusRole.button,
  },
});
