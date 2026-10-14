import React from 'react';
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
import { Pill } from './Pill';
import { RefIcon, type IconRef, type IconVariant } from '../icons';
import { useButtonGroup } from '../lib/buttonGroup';
import { androidRipple, rippleClip, showPressedStyle } from '../lib/pressableFeedback';

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
  /**
   * Heroicons adı. Düğmede ikon İSTİSNADIR (varsayılan ikonsuz): yalnız web'in aynı yerde ikon
   * gösterdiği ya da işlev taşıyan (paylaş, favori, sepet, filtre, sırala, geri/kapat, ekle)
   * yerlerde. Dekoratif ikon `tarodan/restrict-button-icon` lint uyarısı verir.
   * Konum `iconPosition` ile.
   */
  icon?: IconRef;
  iconVariant?: IconVariant;
  iconPosition?: 'left' | 'right';
  /** Etiketin sonunda küçük sayaç (ör. aktif filtre sayısı); 0/undefined çizilmez. */
  count?: number;
  countTestID?: string;
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
  // Beyaz zemin (web outline = bg-white + border): gri alt çubuk/kart üstünde de beyaz görünür.
  outline: { bg: colors.surface.elevated, text: colors.text.body, border: colors.border.DEFAULT },
  ghost: { bg: 'transparent', text: colors.text.body },
  danger: { bg: colors.danger[600], text: colors.text.inverted },
  success: { bg: colors.success[600], text: colors.text.inverted },
  warning: { bg: colors.warning[500], text: colors.text.inverted },
  link: { bg: 'transparent', text: colors.primary[600] },
};

/**
 * Yükseklik/dolgu web ile aynı (sm h-8 px-3 · md h-10 px-4 · lg h-12 px-6 · xl h-14 px-8). Etiket
 * boyu: sm web gibi, md/lg/xl telefonda bir basamak büyük (iOS HIG; md = gövde/Input `base`):
 * sm `sm` (14) · md `base` (16) · lg `lg` (17) · xl `xl` (20). Sığmazsa `adjustsFontSizeToFit`.
 * `height` = ASGARİ yükseklik (`minHeight`): normal yazı ölçeğinde düğme tam bu boydadır; büyük
 * ölçekte (en çok `maxFontScale.control`) etiket kırpılmasın diye büyüyebilir.
 */
const sizeStyle: Record<ButtonSize, { height: number; px: number; font: number; icon: number }> = {
  sm: { height: controlHeight.sm, px: spacing[3], font: typography.fontSize.sm, icon: iconSize.sm },
  md: { height: controlHeight.md, px: spacing[4], font: typography.fontSize.base, icon: iconSize.sm },
  lg: { height: controlHeight.lg, px: spacing[6], font: typography.fontSize.lg, icon: iconSize.md },
  xl: { height: controlHeight.xl, px: spacing[8], font: typography.fontSize.xl, icon: iconSize.md },
};

/** Büyük yazı ölçeğinde etiketin kenarlara yapışmaması için dikey iç boşluk (normal ölçekte etkisiz). */
const BUTTON_PAD_Y = spacing[1];

/** Etiket sığmazsa en çok bu orana kadar küçülür (adjustsFontSizeToFit). */
const BUTTON_MIN_FONT_SCALE = 0.85;

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
  iconVariant,
  iconPosition = 'left',
  count,
  countTestID,
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
  const grouped = useButtonGroup();
  const ionIconNode = icon ? (
    <RefIcon icon={icon} variant={iconVariant} size={ss.icon} color={vs.text} />
  ) : null;
  const resolvedLeftIcon = leftIcon ?? (iconPosition === 'left' ? ionIconNode : null);
  const resolvedRightIcon = rightIcon ?? (iconPosition === 'right' ? ionIconNode : null);
  const visualHeight = isLink ? ss.font * 1.5 : ss.height;
  // Çağıran sabit `height` verdiyse asgari yükseklik onu ezmesin (eski davranış korunur).
  const fixedHeight = StyleSheet.flatten(style)?.height != null;
  // Dolu zemin (etiket ters renk) → açık dalga; şeffaf/açık zemin → koyu dalga.
  const ripple = androidRipple({ tone: vs.text === colors.text.inverted ? 'onDark' : 'onLight' });

  return (
    <Pressable
      disabled={disabled || isLoading}
      hitSlop={hitSlop ?? touchSlop(visualHeight)}
      android_ripple={ripple}
      style={({ pressed }) => [
        styles.base,
        rippleClip(),
        {
          backgroundColor: vs.bg,
          borderColor: vs.border ?? 'transparent',
          borderWidth: vs.border ? 1 : 0,
          opacity: disabled || isLoading ? 0.5 : showPressedStyle(pressed) ? 0.85 : 1,
          alignSelf: fullWidth || grouped ? 'stretch' : 'flex-start',
        },
        isLink
          ? styles.link
          : {
              minHeight: fixedHeight ? undefined : ss.height,
              paddingVertical: BUTTON_PAD_Y,
              paddingHorizontal: ss.px,
            },
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
            numberOfLines={1}
            // Metin sarmaz ve kısaltılmaz: sığmazsa 0.85'e kadar küçülür (iOS + Android, RN 0.81).
            adjustsFontSizeToFit
            minimumFontScale={BUTTON_MIN_FONT_SCALE}
            maxFontSizeMultiplier={typography.maxFontScale.control}
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
        {count ? (
          <Pill
            size="count"
            background={colors.primary[500]}
            color={colors.text.inverted}
            weight={typography.fontWeight.bold}
            style={styles.count}
            testID={countTestID ?? 'button-count'}
          >
            {String(count)}
          </Pill>
        ) : null}
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
    // Dar alanda etiket (tek satır) kapsayıcıdan taşmasın diye satır kutusu da küçülebilir.
    flexShrink: 1,
    minWidth: 0,
  },
  // Web `whitespace-nowrap`: etiket ASLA sarmaz (tek satır). Sığdırma işini `ButtonRow` yapar.
  text: {
    textAlign: 'center',
    flexShrink: 1,
  },
  // Web: bg-primary-500 text-2xs font-bold (Pill count tabanı); köşe tek rozet köşesi (radiusRole.badge).
  count: { marginLeft: spacing[2], borderRadius: theme.radiusRole.badge },
  iconLeft: { marginRight: spacing[2] },
  iconRight: { marginLeft: spacing[2] },
});
