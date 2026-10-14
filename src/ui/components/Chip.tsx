import React from 'react';
import {
  Pressable,
  useWindowDimensions,
  type PressableProps,
  type ViewStyle,
} from 'react-native';
import { theme } from '../lib/theme';
import { touchSlop } from './Button';
import { RawText } from './Text';
import { Icon, type IconName } from '../icons';
import { pillBoxStyle, pillTextStyle, type PillSize } from './Pill';
import { androidRipple, rippleClip, showPressedStyle } from '../lib/pressableFeedback';

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
  /** `sm` (varsayılan) = px-2 text-sm (14pt) asgari h28 — gövde yazısıyla eşit; `md` biraz daha iri (h32). */
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

const { colors, typography, spacing } = theme;

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

/**
 * Çip = tam yuvarlak hap (Pill tabanı): sm → Pill body (px-2 text-sm) h28; md → Pill lg (px-3 text-sm) h32.
 * `height` ASGARİ yüksekliktir (`minHeight` + küçük dikey dolgu): normal yazı ölçeğinde çip tam bu
 * boydadır, büyük ölçekte etiket kırpılmadan büyür.
 *
 * Dikey gerilme: çip yanlış bir ebeveynde (ör. `alignItems: 'stretch'` satır, `flexGrow:1` yatay
 * ScrollView içeriği) `minHeight` yüzünden sınırsız uzayabilirdi. Bu yüzden `maxHeight` =
 * asgari boy × (yazı ölçeği, etiketin `maxFontSizeMultiplier` tavanıyla kırpılmış) + küçük pay:
 * büyük yazıda çip yine etiketine göre büyür ama ebeveyn gerdirse de bu tavanı aşmaz.
 * (`alignSelf` kullanılmadı: ebeveynin `alignItems` hizasını — center/flex-start — bozardı.)
 */
const sizeMap: Record<ChipSize, { height: number; pill: PillSize }> = {
  sm: { height: spacing[6] + spacing[1], pill: 'body' },
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
  const { fontScale } = useWindowDimensions();
  const maxHeight =
    Math.ceil(ss.height * Math.min(Math.max(fontScale, 1), typography.maxFontScale.control)) + spacing[1];
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
      android_ripple={onPress ? androidRipple() : undefined}
      style={({ pressed }) => [
        pillBoxStyle(ss.pill, 'full'),
        onPress ? rippleClip() : null,
        trailingIcon ? { gap: spacing[1] } : null,
        {
          minHeight: ss.height,
          maxHeight,
          paddingVertical: spacing[0.5],
          borderWidth: 1,
          backgroundColor: bg,
          borderColor: look.border,
          opacity: disabled ? 0.5 : onPress && showPressedStyle(pressed) ? 0.85 : 1,
        },
        style,
      ]}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={isOn === undefined ? undefined : { selected: isOn }}
      {...rest}
    >
      <RawText
        style={pillTextStyle(ss.pill, fg, typography.fontWeight.regular)}
        numberOfLines={1}
        maxFontSizeMultiplier={typography.maxFontScale.control}
      >
        {label}
      </RawText>
      {trailingIcon ? <Icon name={trailingIcon} size={theme.iconSize.sm} color={fg} /> : null}
    </Pressable>
  );
};

