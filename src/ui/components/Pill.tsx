import React from 'react';
import { StyleSheet, View, type StyleProp, type TextStyle, type ViewProps, type ViewStyle } from 'react-native';
import { theme } from '../lib/theme';
import { RawText } from './Text';

/**
 * Rozet / çip / sayaç ailesinin TEK tabanı: ortak boyut, dolgu, köşe ve yazı token'ları burada.
 * `Badge` (+ `StatusBadge`, `ProductBadge`), `CountBadge` ve `Chip` bunu kullanır; ekranlarda
 * elle `View + Text` ile hap çizilmez (bkz. CLAUDE.md §14).
 */
export type PillSize = 'count' | 'sm' | 'md' | 'lg';
/** `badge` = web `rounded-lg`/rozet köşesi (radiusRole.badge), `full` = tam yuvarlak (çip, sayaç). */
export type PillShape = 'badge' | 'full';

const { radius, radiusRole, spacing, typography, colors } = theme;

/**
 * Web: sm px-2 py-0.5 text-xs · md px-2.5 py-1 text-sm · lg px-3 py-2 text-sm.
 * `count` = CountBadge (h18 min-w18 text-2xs). Çip yükseklikleri (24/32) çipin kendisinde.
 */
export const pillMetrics = {
  count: { px: spacing[1], py: 0, font: typography.fontSize['2xs'], minHeight: 18 },
  sm: { px: spacing[2], py: spacing[0.5], font: typography.fontSize.xs, minHeight: 0 },
  md: { px: spacing[2.5], py: spacing[1], font: typography.fontSize.sm, minHeight: 0 },
  lg: { px: spacing[3], py: spacing[2], font: typography.fontSize.sm, minHeight: 0 },
} as const;

export const pillRadius: Record<PillShape, number> = {
  badge: radiusRole.badge,
  full: radius.full,
};

/** Hap kutusu stili (renkler çağıranda). */
export function pillBoxStyle(size: PillSize, shape: PillShape): ViewStyle {
  const m = pillMetrics[size];
  return {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: m.px,
    paddingVertical: m.py,
    minHeight: m.minHeight || undefined,
    minWidth: size === 'count' ? m.minHeight : undefined,
    borderRadius: pillRadius[shape],
  };
}

/** Hap yazı stili. */
export function pillTextStyle(size: PillSize, color: string, weight: TextStyle['fontWeight'] = typography.fontWeight.semibold): TextStyle {
  const font = pillMetrics[size].font;
  return {
    color,
    fontSize: font,
    lineHeight: size === 'count' ? font * typography.lineHeight.tight : undefined,
    fontWeight: weight,
  };
}

export interface PillProps extends ViewProps {
  size?: PillSize;
  shape?: PillShape;
  /** Zemin rengi. */
  background?: string;
  /** Yazı/ikon rengi. */
  color?: string;
  /** Verilirse 1px çerçeve. */
  borderColor?: string;
  weight?: TextStyle['fontWeight'];
  /** Etiketin önünde küçük ikon. */
  icon?: React.ReactNode;
  textStyle?: StyleProp<TextStyle>;
  numberOfLines?: number;
  children?: React.ReactNode;
}

export const Pill: React.FC<PillProps> = ({
  size = 'md',
  shape = 'badge',
  background = colors.transparent,
  color = colors.text.body,
  borderColor,
  weight,
  icon,
  textStyle,
  numberOfLines,
  style,
  children,
  ...rest
}) => (
  <View
    style={[
      pillBoxStyle(size, shape),
      styles.gap,
      { backgroundColor: background, borderColor: borderColor ?? colors.transparent, borderWidth: borderColor ? 1 : 0 },
      style,
    ]}
    {...rest}
  >
    {icon}
    {typeof children === 'string' || typeof children === 'number' ? (
      <RawText numberOfLines={numberOfLines} style={[pillTextStyle(size, color, weight), styles.text, textStyle]}>
        {children}
      </RawText>
    ) : (
      children
    )}
  </View>
);

const styles = StyleSheet.create({
  gap: { gap: spacing[1] },
  text: { flexShrink: 1 },
});
