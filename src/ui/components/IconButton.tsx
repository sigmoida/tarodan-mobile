import React from 'react';
import {
  Pressable,
  StyleSheet,
  type PressableProps,
  type ViewStyle,
} from 'react-native';
import { theme } from '../lib/theme';
import { RefIcon, type IconRef, type IconVariant } from '../icons';
import { androidRipple, rippleClip, showPressedStyle } from '../lib/pressableFeedback';
import { LoadingIndicator } from '../loading/LoadingIndicator';

/**
 * Web `@tarodan/ui` IconButton variants: primary, secondary, outline, outline-primary,
 * ghost (default), danger, success. Web also has `warning` (solid), which mobile does not have yet. Old mobile names
 * still work as aliases: `plain` -> ghost, `solid` -> primary, `soft` -> brand tint
 * (primary-50/700; no web counterpart).
 */
export type IconButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'outline-primary'
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
  /** `square` (varsayılan: `radiusRole.button` köşe) ya da `round` (tam daire; ör. sohbet ekle/gönder). */
  shape?: 'square' | 'round';
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

/** `pressedBg` = web `active:bg-*`, drawn on the iOS press (Android shows the ripple). */
const variantStyle: Record<
  IconButtonVariant,
  { bg: string; fg: string; border?: string; pressedBg?: string }
> = {
  primary: { bg: colors.primary[600], fg: colors.text.inverted },
  secondary: { bg: colors.surface.alt, fg: colors.text.heading },
  outline: { bg: 'transparent', fg: colors.text.body, border: colors.border.DEFAULT },
  // Web `outline-primary`: transparent, primary-600 border, primary-700 icon (the same tokens as
  // the `Button` variant, so the icon-only and text toggles look alike).
  'outline-primary': {
    bg: 'transparent',
    fg: colors.primary[700],
    border: colors.primary[600],
    pressedBg: colors.primary[100],
  },
  ghost: { bg: 'transparent', fg: colors.text.muted },
  danger: { bg: 'transparent', fg: colors.danger[600] },
  success: { bg: 'transparent', fg: colors.success[600] },
  // Aliases (old mobile API).
  plain: { bg: 'transparent', fg: colors.text.muted },
  solid: { bg: colors.primary[600], fg: colors.text.inverted },
  soft: { bg: colors.primary[50], fg: colors.primary[700] },
};

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  iconVariant,
  variant = 'ghost',
  size = 'md',
  shape = 'square',
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
          backgroundColor: showPressedStyle(pressed) && vs.pressedBg ? vs.pressedBg : vs.bg,
          borderColor: vs.border ?? 'transparent',
          borderWidth: vs.border ? 1 : 0,
          borderRadius: shape === 'round' ? ss.box / 2 : radiusRole.button,
          // A variant with its own pressed fill (web `active:bg-*`) keeps full opacity, so the
          // border and icon stay at their contrast; the others fade on the iOS press.
          opacity:
            disabled || isLoading ? 0.5 : showPressedStyle(pressed) && !vs.pressedBg ? 0.7 : 1,
        },
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!(disabled || isLoading), busy: !!isLoading }}
      {...rest}
    >
      {isLoading ? (
        // İkonun yerinde, ikon boyunda (xs 16 · sm/md/lg 20) ve ikon renginde.
        <LoadingIndicator size={ss.icon > iconSize.sm ? 'md' : 'sm'} color={fg} testID="icon-button-loading" />
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
